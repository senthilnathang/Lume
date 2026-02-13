<template>
  <div class="workflow-designer">
    <!-- Header -->
    <PageHeader
      :title="isEdit ? `Edit: ${workflow.name}` : 'New Workflow'"
      :sub-title="workflow.model_name ? `Model: ${workflow.model_name}` : 'Visual Workflow Designer'"
      @back="handleBack"
    >
      <template #extra>
        <Space>
          <Button @click="handleAutoLayout">
            <template #icon><AppstoreOutlined /></template>
            Auto Layout
          </Button>
          <Button @click="handleZoomFit">
            <template #icon><FullscreenOutlined /></template>
            Fit View
          </Button>
          <Dropdown>
            <Button>
              <template #icon><MoreOutlined /></template>
            </Button>
            <template #overlay>
              <Menu>
                <MenuItem @click="handleExportJson">Export JSON</MenuItem>
                <MenuItem @click="handleImportJson">Import JSON</MenuItem>
                <MenuDivider />
                <MenuItem @click="handleExportImage">Export as Image</MenuItem>
              </Menu>
            </template>
          </Dropdown>
          <Button type="primary" @click="handleSave" :loading="saving">
            <template #icon><SaveOutlined /></template>
            Save Workflow
          </Button>
        </Space>
      </template>
    </PageHeader>

    <div class="designer-layout">
      <!-- Left Sidebar: Toolbox -->
      <div class="toolbox-panel">
        <Card title="Add Elements" size="small" :bordered="false">
          <div class="toolbox-items">
            <div
              class="toolbox-item"
              draggable="true"
              @dragstart="handleToolDragStart('state', $event)"
            >
              <div class="toolbox-icon state-icon">
                <BorderOutlined />
              </div>
              <span>State</span>
            </div>
            <div
              class="toolbox-item"
              draggable="true"
              @dragstart="handleToolDragStart('start', $event)"
            >
              <div class="toolbox-icon start-icon">
                <PlayCircleOutlined />
              </div>
              <span>Start</span>
            </div>
            <div
              class="toolbox-item"
              draggable="true"
              @dragstart="handleToolDragStart('end', $event)"
            >
              <div class="toolbox-icon end-icon">
                <StopOutlined />
              </div>
              <span>End</span>
            </div>
            <div
              class="toolbox-item"
              draggable="true"
              @dragstart="handleToolDragStart('decision', $event)"
            >
              <div class="toolbox-icon decision-icon">
                <BranchesOutlined />
              </div>
              <span>Decision</span>
            </div>
          </div>
        </Card>

        <Card title="Workflow Info" size="small" :bordered="false" style="margin-top: 12px;">
          <Form layout="vertical" size="small">
            <FormItem label="Name" required>
              <Input v-model:value="workflow.name" placeholder="Workflow name" />
            </FormItem>
            <FormItem label="Code" required>
              <Input v-model:value="workflow.code" placeholder="workflow_code" :disabled="isEdit" />
            </FormItem>
            <FormItem label="Model">
              <Select v-model:value="workflow.model_name" placeholder="Select model" show-search>
                <SelectOption v-for="m in modelOptions" :key="m.value" :value="m.value">
                  {{ m.label }}
                </SelectOption>
              </Select>
            </FormItem>
            <FormItem label="Description">
              <Textarea v-model:value="workflow.description" :rows="2" placeholder="Description" />
            </FormItem>
            <FormItem>
              <Checkbox v-model:checked="workflow.is_active">Active</Checkbox>
            </FormItem>
          </Form>
        </Card>

        <Card title="Statistics" size="small" :bordered="false" style="margin-top: 12px;">
          <Descriptions :column="1" size="small">
            <DescriptionsItem label="States">{{ workflow.states.length }}</DescriptionsItem>
            <DescriptionsItem label="Transitions">{{ workflow.transitions.length }}</DescriptionsItem>
            <DescriptionsItem label="Start States">{{ startStatesCount }}</DescriptionsItem>
            <DescriptionsItem label="End States">{{ endStatesCount }}</DescriptionsItem>
          </Descriptions>
        </Card>
      </div>

      <!-- Main Canvas -->
      <div class="canvas-container" ref="canvasContainer">
        <div
          class="canvas"
          ref="canvas"
          :style="canvasStyle"
          @drop="handleCanvasDrop"
          @dragover.prevent
          @click="handleCanvasClick"
          @mousedown="handleCanvasMouseDown"
          @mousemove="handleCanvasMouseMove"
          @mouseup="handleCanvasMouseUp"
          @wheel="handleCanvasWheel"
        >
          <!-- Grid Background -->
          <svg class="grid-background" width="100%" height="100%">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e8e8e8" stroke-width="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          <!-- Connections (Transitions) SVG Layer -->
          <svg class="connections-layer" :viewBox="svgViewBox">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#1890ff" />
              </marker>
              <marker
                id="arrowhead-selected"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#722ed1" />
              </marker>
            </defs>

            <!-- Existing Transitions -->
            <g v-for="(transition, idx) in workflow.transitions" :key="'t-' + idx">
              <path
                :d="getTransitionPath(transition)"
                :stroke="selectedTransition === idx ? '#722ed1' : '#1890ff'"
                :stroke-width="selectedTransition === idx ? 3 : 2"
                fill="none"
                :marker-end="selectedTransition === idx ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'"
                class="transition-path"
                @click.stop="selectTransition(idx)"
              />
              <text
                :x="getTransitionLabelPos(transition).x"
                :y="getTransitionLabelPos(transition).y"
                text-anchor="middle"
                class="transition-label"
                @click.stop="selectTransition(idx)"
              >
                {{ transition.name || transition.code }}
              </text>
            </g>

            <!-- Drawing Connection -->
            <path
              v-if="isDrawingConnection"
              :d="drawingConnectionPath"
              stroke="#1890ff"
              stroke-width="2"
              stroke-dasharray="5,5"
              fill="none"
              marker-end="url(#arrowhead)"
            />
          </svg>

          <!-- State Nodes -->
          <div
            v-for="(state, idx) in workflow.states"
            :key="'s-' + state.code"
            class="state-node"
            :class="{
              'is-start': state.is_start,
              'is-end': state.is_end,
              'is-selected': selectedState === idx,
              'is-decision': state.is_decision,
            }"
            :style="getStateStyle(state)"
            @mousedown.stop="handleStateMouseDown(idx, $event)"
            @click.stop="selectState(idx)"
          >
            <div class="state-icon">
              <PlayCircleOutlined v-if="state.is_start" />
              <StopOutlined v-else-if="state.is_end" />
              <BranchesOutlined v-else-if="state.is_decision" />
              <BorderOutlined v-else />
            </div>
            <div class="state-content">
              <div class="state-name">{{ state.name }}</div>
              <div class="state-code">{{ state.code }}</div>
            </div>

            <!-- Connection Anchors -->
            <div
              class="anchor anchor-right"
              @mousedown.stop="startConnection(idx, 'right', $event)"
            />
            <div
              class="anchor anchor-bottom"
              @mousedown.stop="startConnection(idx, 'bottom', $event)"
            />
            <div class="anchor anchor-left" />
            <div class="anchor anchor-top" />
          </div>
        </div>

        <!-- Zoom Controls -->
        <div class="zoom-controls">
          <ButtonGroup>
            <Button @click="zoomIn"><ZoomInOutlined /></Button>
            <Button @click="zoomOut"><ZoomOutOutlined /></Button>
            <Button @click="resetZoom">{{ Math.round(zoom * 100) }}%</Button>
          </ButtonGroup>
        </div>

        <!-- Mini Map -->
        <div class="minimap" v-if="workflow.states.length > 0">
          <svg :viewBox="minimapViewBox" width="150" height="100">
            <rect
              v-for="(state, idx) in workflow.states"
              :key="'mm-' + idx"
              :x="(state.x || 100) / 10"
              :y="(state.y || 100) / 10"
              width="12"
              height="8"
              :fill="state.is_start ? '#52c41a' : state.is_end ? '#f5222d' : '#1890ff'"
              rx="2"
            />
          </svg>
        </div>
      </div>

      <!-- Right Sidebar: Properties Panel -->
      <div class="properties-panel">
        <!-- State Properties -->
        <Card
          v-if="selectedState !== null"
          title="State Properties"
          size="small"
          :bordered="false"
        >
          <template #extra>
            <Button type="text" danger size="small" @click="deleteSelectedState">
              <DeleteOutlined />
            </Button>
          </template>
          <Form layout="vertical" size="small">
            <FormItem label="Name" required>
              <Input v-model:value="workflow.states[selectedState].name" />
            </FormItem>
            <FormItem label="Code" required>
              <Input v-model:value="workflow.states[selectedState].code" />
            </FormItem>
            <FormItem label="Color">
              <Input v-model:value="workflow.states[selectedState].color" type="color" />
            </FormItem>
            <FormItem label="SLA Hours">
              <InputNumber
                v-model:value="workflow.states[selectedState].sla_hours"
                :min="0"
                placeholder="No SLA"
                style="width: 100%"
              />
            </FormItem>
            <FormItem>
              <Space direction="vertical">
                <Checkbox v-model:checked="workflow.states[selectedState].is_start">
                  Start State
                </Checkbox>
                <Checkbox v-model:checked="workflow.states[selectedState].is_end">
                  End State
                </Checkbox>
                <Checkbox v-model:checked="workflow.states[selectedState].is_decision">
                  Decision Point
                </Checkbox>
              </Space>
            </FormItem>
          </Form>
        </Card>

        <!-- Transition Properties -->
        <Card
          v-else-if="selectedTransition !== null"
          title="Transition Properties"
          size="small"
          :bordered="false"
        >
          <template #extra>
            <Button type="text" danger size="small" @click="deleteSelectedTransition">
              <DeleteOutlined />
            </Button>
          </template>
          <Form layout="vertical" size="small">
            <FormItem label="Name" required>
              <Input v-model:value="workflow.transitions[selectedTransition].name" />
            </FormItem>
            <FormItem label="Code">
              <Input v-model:value="workflow.transitions[selectedTransition].code" />
            </FormItem>
            <FormItem label="Button Label">
              <Input v-model:value="workflow.transitions[selectedTransition].button_name" />
            </FormItem>
            <FormItem label="Button Style">
              <Select v-model:value="workflow.transitions[selectedTransition].button_class">
                <SelectOption value="btn-primary">Primary</SelectOption>
                <SelectOption value="btn-success">Success</SelectOption>
                <SelectOption value="btn-warning">Warning</SelectOption>
                <SelectOption value="btn-danger">Danger</SelectOption>
                <SelectOption value="btn-default">Default</SelectOption>
              </Select>
            </FormItem>
            <FormItem label="Confirm Message">
              <Textarea
                v-model:value="workflow.transitions[selectedTransition].confirm_message"
                :rows="2"
                placeholder="Optional confirmation"
              />
            </FormItem>

            <Divider>Conditions</Divider>

            <FormItem label="Required Groups">
              <Select
                v-model:value="workflow.transitions[selectedTransition].required_groups"
                mode="tags"
                placeholder="Enter group names"
              />
            </FormItem>

            <Divider>Actions</Divider>

            <FormItem>
              <Checkbox v-model:checked="workflow.transitions[selectedTransition].requires_approval">
                Requires Approval
              </Checkbox>
            </FormItem>
            <FormItem v-if="workflow.transitions[selectedTransition].requires_approval" label="Approval Chain">
              <Select
                v-model:value="workflow.transitions[selectedTransition].approval_chain_id"
                placeholder="Select chain"
                allow-clear
              >
                <SelectOption v-for="chain in approvalChains" :key="chain.id" :value="chain.id">
                  {{ chain.name }}
                </SelectOption>
              </Select>
            </FormItem>

            <Divider>Timer (Phase 8)</Divider>

            <FormItem label="Auto-transition after">
              <InputNumber
                v-model:value="workflow.transitions[selectedTransition].timer_hours"
                :min="0"
                placeholder="Hours"
                style="width: 100%"
              />
              <div class="form-help">Leave empty for manual transition only</div>
            </FormItem>

            <Divider>Webhook (Phase 8)</Divider>

            <FormItem label="Webhook URL">
              <Input
                v-model:value="workflow.transitions[selectedTransition].webhook_url"
                placeholder="https://..."
              />
            </FormItem>
            <FormItem v-if="workflow.transitions[selectedTransition].webhook_url" label="Method">
              <Select v-model:value="workflow.transitions[selectedTransition].webhook_method" style="width: 100%">
                <SelectOption value="POST">POST</SelectOption>
                <SelectOption value="PUT">PUT</SelectOption>
                <SelectOption value="PATCH">PATCH</SelectOption>
              </Select>
            </FormItem>
          </Form>
        </Card>

        <!-- No Selection -->
        <Card v-else title="Properties" size="small" :bordered="false">
          <AEmpty description="Select a state or transition to edit its properties" />
        </Card>

        <!-- Validation -->
        <Card
          v-if="validationErrors.length > 0"
          title="Validation"
          size="small"
          :bordered="false"
          style="margin-top: 12px;"
        >
          <Alert
            v-for="(error, idx) in validationErrors"
            :key="idx"
            :message="error"
            type="error"
            size="small"
            style="margin-bottom: 8px;"
            show-icon
          />
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
  Alert,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Descriptions,
  Divider,
  Dropdown,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  Menu,
  Modal,
  PageHeader,
  Select,
  SelectOption,
  Space,
  Textarea,
  message,
  MenuItem,
  DescriptionsItem,
  MenuDivider,
} from 'ant-design-vue';
import {
  SaveOutlined,
  AppstoreOutlined,
  FullscreenOutlined,
  MoreOutlined,
  BorderOutlined,
  PlayCircleOutlined,
  StopOutlined,
  BranchesOutlined,
  DeleteOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons-vue';
import {
  getWorkflowDefinitionApi,
  createWorkflowDefinitionApi,
  updateWorkflowDefinitionApi,
  getApprovalChainsApi,
} from '#/api/base_automation';

const props = defineProps({
  workflowId: {
    type: [String, Number],
    default: null,
  },
});

const emit = defineEmits(['back', 'saved']);

// State
const loading = ref(false);
const saving = ref(false);
const canvasContainer = ref(null);
const canvas = ref(null);

// Workflow data
const workflow = ref({
  id: null,
  name: '',
  code: '',
  description: '',
  model_name: '',
  state_field: 'state',
  default_state: '',
  is_active: true,
  states: [],
  transitions: [],
});

// Selection
const selectedState = ref(null);
const selectedTransition = ref(null);

// Canvas state
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });

// Dragging state
const isDragging = ref(false);
const draggedStateIdx = ref(null);
const dragOffset = ref({ x: 0, y: 0 });

// Connection drawing
const isDrawingConnection = ref(false);
const connectionStart = ref({ stateIdx: null, anchor: null, x: 0, y: 0 });
const connectionEnd = ref({ x: 0, y: 0 });

// Options
const approvalChains = ref([]);
const modelOptions = [
  { value: 'hr.leave', label: 'Leave Request' },
  { value: 'hr.expense', label: 'Expense Report' },
  { value: 'hr.travel', label: 'Travel Request' },
  { value: 'hr.loan', label: 'Loan Request' },
  { value: 'hr.overtime', label: 'Overtime Request' },
  { value: 'purchase.order', label: 'Purchase Order' },
  { value: 'project.project', label: 'Project' },
  { value: 'project.task', label: 'Task' },
];

// Computed
const isEdit = computed(() => !!props.workflowId);

const startStatesCount = computed(() =>
  workflow.value.states.filter(s => s.is_start).length
);

const endStatesCount = computed(() =>
  workflow.value.states.filter(s => s.is_end).length
);

const canvasStyle = computed(() => ({
  transform: `scale(${zoom.value}) translate(${panX.value}px, ${panY.value}px)`,
  transformOrigin: '0 0',
}));

const svgViewBox = computed(() => {
  const width = 2000;
  const height = 1500;
  return `0 0 ${width} ${height}`;
});

const minimapViewBox = computed(() => '0 0 200 150');

const drawingConnectionPath = computed(() => {
  if (!isDrawingConnection.value) return '';
  const start = connectionStart.value;
  const end = connectionEnd.value;
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
});

const validationErrors = computed(() => {
  const errors = [];
  if (!workflow.value.name) errors.push('Workflow name is required');
  if (!workflow.value.code) errors.push('Workflow code is required');
  if (!workflow.value.model_name) errors.push('Model is required');
  if (workflow.value.states.length === 0) errors.push('At least one state is required');
  if (startStatesCount.value === 0) errors.push('At least one start state is required');
  if (endStatesCount.value === 0) errors.push('At least one end state is required');

  // Check for duplicate state codes
  const codes = workflow.value.states.map(s => s.code);
  const duplicates = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (duplicates.length > 0) {
    errors.push(`Duplicate state codes: ${duplicates.join(', ')}`);
  }

  return errors;
});

// Methods
function getStateStyle(state) {
  return {
    left: `${state.x || 100}px`,
    top: `${state.y || 100}px`,
    borderColor: state.color || '#1890ff',
  };
}

function getStateCenter(state) {
  return {
    x: (state.x || 100) + 75, // Half of state width (150/2)
    y: (state.y || 100) + 30, // Half of state height (60/2)
  };
}

function getTransitionPath(transition) {
  const fromState = workflow.value.states.find(s => s.code === transition.from_state);
  const toState = workflow.value.states.find(s => s.code === transition.to_state);

  if (!fromState || !toState) return '';

  const from = getStateCenter(fromState);
  const to = getStateCenter(toState);

  // Calculate control points for curved path
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Offset the start and end points to edge of nodes
  const nodeRadius = 75;
  const angle = Math.atan2(dy, dx);

  const startX = from.x + nodeRadius * Math.cos(angle);
  const startY = from.y + nodeRadius * Math.sin(angle);
  const endX = to.x - nodeRadius * Math.cos(angle);
  const endY = to.y - nodeRadius * Math.sin(angle);

  // Create curved path
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const curvature = Math.min(distance / 4, 50);
  const perpX = -dy / distance * curvature;
  const perpY = dx / distance * curvature;

  return `M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY} ${endX} ${endY}`;
}

function getTransitionLabelPos(transition) {
  const fromState = workflow.value.states.find(s => s.code === transition.from_state);
  const toState = workflow.value.states.find(s => s.code === transition.to_state);

  if (!fromState || !toState) return { x: 0, y: 0 };

  const from = getStateCenter(fromState);
  const to = getStateCenter(toState);

  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2 - 10,
  };
}

// Event Handlers
function handleBack() {
  emit('back');
}

function handleCanvasClick(e) {
  if (e.target === canvas.value || e.target.classList.contains('grid-background')) {
    selectedState.value = null;
    selectedTransition.value = null;
  }
}

function handleCanvasMouseDown(e) {
  if (e.target === canvas.value || e.target.tagName === 'svg' || e.target.tagName === 'rect') {
    isPanning.value = true;
    panStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value };
  }
}

function handleCanvasMouseMove(e) {
  if (isPanning.value) {
    panX.value = e.clientX - panStart.value.x;
    panY.value = e.clientY - panStart.value.y;
  }

  if (isDragging.value && draggedStateIdx.value !== null) {
    const rect = canvas.value.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom.value - dragOffset.value.x;
    const y = (e.clientY - rect.top) / zoom.value - dragOffset.value.y;

    workflow.value.states[draggedStateIdx.value].x = Math.max(0, Math.round(x / 20) * 20);
    workflow.value.states[draggedStateIdx.value].y = Math.max(0, Math.round(y / 20) * 20);
  }

  if (isDrawingConnection.value) {
    const rect = canvas.value.getBoundingClientRect();
    connectionEnd.value = {
      x: (e.clientX - rect.left) / zoom.value,
      y: (e.clientY - rect.top) / zoom.value,
    };
  }
}

function handleCanvasMouseUp(e) {
  isPanning.value = false;

  if (isDragging.value) {
    isDragging.value = false;
    draggedStateIdx.value = null;
  }

  if (isDrawingConnection.value) {
    // Check if we dropped on a state
    const rect = canvas.value.getBoundingClientRect();
    const dropX = (e.clientX - rect.left) / zoom.value;
    const dropY = (e.clientY - rect.top) / zoom.value;

    // Find target state
    const targetIdx = workflow.value.states.findIndex(s => {
      const sx = s.x || 100;
      const sy = s.y || 100;
      return dropX >= sx && dropX <= sx + 150 && dropY >= sy && dropY <= sy + 60;
    });

    if (targetIdx !== -1 && targetIdx !== connectionStart.value.stateIdx) {
      const fromState = workflow.value.states[connectionStart.value.stateIdx];
      const toState = workflow.value.states[targetIdx];

      // Create new transition
      const newTransition = {
        from_state: fromState.code,
        to_state: toState.code,
        name: `${fromState.name} → ${toState.name}`,
        code: `${fromState.code}_to_${toState.code}`,
        button_name: `Go to ${toState.name}`,
        button_class: 'btn-primary',
        required_groups: [],
        requires_approval: false,
        sequence: workflow.value.transitions.length * 10 + 10,
      };

      workflow.value.transitions.push(newTransition);
      selectedTransition.value = workflow.value.transitions.length - 1;
      selectedState.value = null;
    }

    isDrawingConnection.value = false;
    connectionStart.value = { stateIdx: null, anchor: null, x: 0, y: 0 };
  }
}

function handleCanvasWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  zoom.value = Math.max(0.25, Math.min(2, zoom.value + delta));
}

function handleStateMouseDown(idx, e) {
  isDragging.value = true;
  draggedStateIdx.value = idx;

  const state = workflow.value.states[idx];
  const rect = canvas.value.getBoundingClientRect();

  dragOffset.value = {
    x: (e.clientX - rect.left) / zoom.value - (state.x || 100),
    y: (e.clientY - rect.top) / zoom.value - (state.y || 100),
  };
}

function startConnection(stateIdx, anchor, e) {
  e.preventDefault();
  e.stopPropagation();

  isDrawingConnection.value = true;
  const state = workflow.value.states[stateIdx];
  const center = getStateCenter(state);

  connectionStart.value = {
    stateIdx,
    anchor,
    x: center.x,
    y: center.y,
  };
  connectionEnd.value = { x: center.x, y: center.y };
}

function selectState(idx) {
  selectedState.value = idx;
  selectedTransition.value = null;
}

function selectTransition(idx) {
  selectedTransition.value = idx;
  selectedState.value = null;
}

function deleteSelectedState() {
  if (selectedState.value === null) return;

  const state = workflow.value.states[selectedState.value];

  Modal.confirm({
    title: 'Delete State',
    content: `Are you sure you want to delete "${state.name}"? This will also delete all transitions to/from this state.`,
    okType: 'danger',
    onOk() {
      // Remove transitions
      workflow.value.transitions = workflow.value.transitions.filter(
        t => t.from_state !== state.code && t.to_state !== state.code
      );

      // Remove state
      workflow.value.states.splice(selectedState.value, 1);
      selectedState.value = null;
    },
  });
}

function deleteSelectedTransition() {
  if (selectedTransition.value === null) return;

  workflow.value.transitions.splice(selectedTransition.value, 1);
  selectedTransition.value = null;
}

function handleToolDragStart(type, e) {
  e.dataTransfer.setData('type', type);
}

function handleCanvasDrop(e) {
  e.preventDefault();
  const type = e.dataTransfer.getData('type');

  if (!type) return;

  const rect = canvas.value.getBoundingClientRect();
  const x = Math.round(((e.clientX - rect.left) / zoom.value) / 20) * 20;
  const y = Math.round(((e.clientY - rect.top) / zoom.value) / 20) * 20;

  const stateCount = workflow.value.states.length;
  const newState = {
    code: `state_${stateCount + 1}`,
    name: type === 'start' ? 'Start' : type === 'end' ? 'End' : type === 'decision' ? 'Decision' : `State ${stateCount + 1}`,
    x,
    y,
    color: type === 'start' ? '#52c41a' : type === 'end' ? '#f5222d' : type === 'decision' ? '#faad14' : '#1890ff',
    is_start: type === 'start',
    is_end: type === 'end',
    is_decision: type === 'decision',
    sequence: stateCount * 10 + 10,
  };

  workflow.value.states.push(newState);
  selectedState.value = workflow.value.states.length - 1;
  selectedTransition.value = null;
}

// Zoom controls
function zoomIn() {
  zoom.value = Math.min(2, zoom.value + 0.1);
}

function zoomOut() {
  zoom.value = Math.max(0.25, zoom.value - 0.1);
}

function resetZoom() {
  zoom.value = 1;
  panX.value = 0;
  panY.value = 0;
}

function handleZoomFit() {
  if (workflow.value.states.length === 0) return;

  const minX = Math.min(...workflow.value.states.map(s => s.x || 100));
  const maxX = Math.max(...workflow.value.states.map(s => (s.x || 100) + 150));
  const minY = Math.min(...workflow.value.states.map(s => s.y || 100));
  const maxY = Math.max(...workflow.value.states.map(s => (s.y || 100) + 60));

  const container = canvasContainer.value;
  if (!container) return;

  const containerWidth = container.clientWidth - 40;
  const containerHeight = container.clientHeight - 40;
  const contentWidth = maxX - minX + 100;
  const contentHeight = maxY - minY + 100;

  zoom.value = Math.min(1, containerWidth / contentWidth, containerHeight / contentHeight);
  panX.value = -minX + 50;
  panY.value = -minY + 50;
}

function handleAutoLayout() {
  const states = workflow.value.states;
  if (states.length === 0) return;

  // Simple left-to-right layout based on dependencies
  const startStates = states.filter(s => s.is_start);
  const endStates = states.filter(s => s.is_end);
  const middleStates = states.filter(s => !s.is_start && !s.is_end);

  let x = 100;
  const spacing = 200;

  // Position start states
  startStates.forEach((s, i) => {
    s.x = x;
    s.y = 100 + i * 100;
  });
  x += spacing;

  // Position middle states
  middleStates.forEach((s, i) => {
    s.x = x + Math.floor(i / 3) * spacing;
    s.y = 100 + (i % 3) * 100;
  });
  x += Math.ceil(middleStates.length / 3) * spacing;

  // Position end states
  endStates.forEach((s, i) => {
    s.x = x;
    s.y = 100 + i * 100;
  });

  handleZoomFit();
}

// Export/Import
function handleExportJson() {
  const data = JSON.stringify(workflow.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${workflow.value.code || 'workflow'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImportJson() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        workflow.value = { ...workflow.value, ...data };
        message.success('Workflow imported successfully');
      } catch (err) {
        message.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function handleExportImage() {
  message.info('Image export coming soon');
}

// Save
async function handleSave() {
  if (validationErrors.value.length > 0) {
    message.error('Please fix validation errors before saving');
    return;
  }

  saving.value = true;
  try {
    const data = {
      name: workflow.value.name,
      code: workflow.value.code,
      description: workflow.value.description,
      model_name: workflow.value.model_name,
      state_field: workflow.value.state_field || 'state',
      default_state: workflow.value.states.find(s => s.is_start)?.code,
      is_active: workflow.value.is_active,
      states: workflow.value.states.map(s => ({
        code: s.code,
        name: s.name,
        color: s.color,
        is_start: s.is_start || false,
        is_end: s.is_end || false,
        sla_hours: s.sla_hours,
        sequence: s.sequence || 10,
        // Store position for visual designer
        x: s.x,
        y: s.y,
      })),
      transitions: workflow.value.transitions.map(t => ({
        from_state: t.from_state,
        to_state: t.to_state,
        name: t.name,
        code: t.code,
        button_name: t.button_name,
        button_class: t.button_class,
        confirm_message: t.confirm_message,
        required_groups: t.required_groups || [],
        requires_approval: t.requires_approval || false,
        approval_chain_id: t.approval_chain_id,
        timer_hours: t.timer_hours,
        webhook_url: t.webhook_url,
        webhook_method: t.webhook_method,
        sequence: t.sequence || 10,
      })),
    };

    if (isEdit.value) {
      await updateWorkflowDefinitionApi(props.workflowId, data);
      message.success('Workflow updated successfully');
    } else {
      await createWorkflowDefinitionApi(data);
      message.success('Workflow created successfully');
    }

    emit('saved');
  } catch (err) {
    console.error('Save failed:', err);
    message.error(err.response?.data?.detail || 'Failed to save workflow');
  } finally {
    saving.value = false;
  }
}

// Load data
async function loadWorkflow() {
  if (!props.workflowId) return;

  loading.value = true;
  try {
    const data = await getWorkflowDefinitionApi(props.workflowId);
    workflow.value = {
      ...data,
      states: (data.states || []).map((s, i) => ({
        ...s,
        x: s.x || 100 + (i % 4) * 200,
        y: s.y || 100 + Math.floor(i / 4) * 100,
      })),
      transitions: data.transitions || [],
    };

    await nextTick();
    handleZoomFit();
  } catch (err) {
    console.error('Load failed:', err);
    message.error('Failed to load workflow');
  } finally {
    loading.value = false;
  }
}

async function loadApprovalChains() {
  try {
    const response = await getApprovalChainsApi({});
    approvalChains.value = response.items || response || [];
  } catch (err) {
    console.error('Failed to load approval chains:', err);
  }
}

// Lifecycle
onMounted(() => {
  loadWorkflow();
  loadApprovalChains();
});
</script>
