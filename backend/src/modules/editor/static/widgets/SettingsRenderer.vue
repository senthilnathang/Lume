<template>
  <div class="settings-renderer">
    <!-- Device toggle for responsive editing -->
    <div class="device-toggle">
      <button :class="['device-btn', activeDevice === 'desktop' && 'active']" title="Desktop" @click="activeDevice = 'desktop'">
        <Monitor :size="14" />
      </button>
      <button :class="['device-btn', activeDevice === 'tablet' && 'active']" title="Tablet" @click="activeDevice = 'tablet'">
        <Tablet :size="14" />
      </button>
      <button :class="['device-btn', activeDevice === 'mobile' && 'active']" title="Mobile" @click="activeDevice = 'mobile'">
        <Smartphone :size="14" />
      </button>
    </div>

    <a-tabs v-if="visibleSections.length > 1" v-model:activeKey="activeSection" size="small">
      <a-tab-pane v-for="section in visibleSections" :key="section" :tab="sectionLabels[section]">
        <!-- Motion FX custom section -->
        <div v-if="section === 'motion'" class="settings-section">
          <!-- Scroll Effects -->
          <div class="motion-section-header">
            <Move :size="14" />
            <span>Scroll Effects</span>
          </div>
          <div v-for="effectKey in scrollEffectKeys" :key="effectKey" class="motion-effect-row">
            <div class="motion-effect-header">
              <a-switch
                :checked="getScrollEffect(effectKey).enabled"
                size="small"
                @change="updateScrollEffect(effectKey, 'enabled', $event)"
              />
              <span class="motion-effect-name">{{ scrollEffectLabels[effectKey] }}</span>
            </div>
            <template v-if="getScrollEffect(effectKey).enabled">
              <div class="setting-group">
                <label class="setting-label">Speed (1-10)</label>
                <a-slider
                  :value="getScrollEffect(effectKey).speed || 5"
                  :min="1"
                  :max="10"
                  :step="1"
                  @change="updateScrollEffect(effectKey, 'speed', $event)"
                />
              </div>
              <div class="setting-group">
                <label class="setting-label">Direction</label>
                <a-select
                  :value="getScrollEffect(effectKey).direction || 'positive'"
                  size="small"
                  style="width: 100%"
                  @change="updateScrollEffect(effectKey, 'direction', $event)"
                >
                  <a-select-option value="positive">Positive</a-select-option>
                  <a-select-option value="negative">Negative</a-select-option>
                </a-select>
              </div>
              <div class="setting-group">
                <label class="setting-label">Viewport Range Start (%)</label>
                <a-slider
                  :value="getScrollEffect(effectKey).range?.start ?? 0"
                  :min="0"
                  :max="100"
                  :step="5"
                  @change="updateScrollEffectRange(effectKey, 'start', $event)"
                />
              </div>
              <div class="setting-group">
                <label class="setting-label">Viewport Range End (%)</label>
                <a-slider
                  :value="getScrollEffect(effectKey).range?.end ?? 100"
                  :min="0"
                  :max="100"
                  :step="5"
                  @change="updateScrollEffectRange(effectKey, 'end', $event)"
                />
              </div>
            </template>
          </div>

          <!-- Mouse Effects -->
          <div class="motion-section-header" style="margin-top: 16px;">
            <MousePointer :size="14" />
            <span>Mouse Effects</span>
          </div>
          <div v-for="effectKey in mouseEffectKeys" :key="effectKey" class="motion-effect-row">
            <div class="motion-effect-header">
              <a-switch
                :checked="getMouseEffect(effectKey).enabled"
                size="small"
                @change="updateMouseEffect(effectKey, 'enabled', $event)"
              />
              <span class="motion-effect-name">{{ mouseEffectLabels[effectKey] }}</span>
            </div>
            <template v-if="getMouseEffect(effectKey).enabled">
              <div class="setting-group">
                <label class="setting-label">Speed (1-10)</label>
                <a-slider
                  :value="getMouseEffect(effectKey).speed || 5"
                  :min="1"
                  :max="10"
                  :step="1"
                  @change="updateMouseEffect(effectKey, 'speed', $event)"
                />
              </div>
            </template>
          </div>

          <!-- Interactions -->
          <div class="motion-section-header" style="margin-top: 16px;">
            <Zap :size="14" />
            <span>Interactions</span>
          </div>
          <div class="repeater-group">
            <div
              v-for="(ix, index) in parsedInteractions"
              :key="index"
              class="repeater-item"
            >
              <div class="repeater-item-header">
                <span class="repeater-item-title">Interaction {{ index + 1 }}</span>
                <button class="repeater-delete-btn" @click="removeInteraction(index)">
                  <Trash2 :size="14" />
                </button>
              </div>
              <div class="repeater-item-content">
                <div class="setting-group">
                  <label class="setting-label">Trigger</label>
                  <a-select :value="ix.trigger" size="small" style="width: 100%" @change="updateInteraction(index, 'trigger', $event)">
                    <a-select-option value="hover">Hover</a-select-option>
                    <a-select-option value="click">Click</a-select-option>
                    <a-select-option value="viewport">Viewport</a-select-option>
                  </a-select>
                </div>
                <div class="setting-group">
                  <label class="setting-label">Action</label>
                  <a-select :value="ix.action" size="small" style="width: 100%" @change="updateInteraction(index, 'action', $event)">
                    <a-select-option value="animate">Animate</a-select-option>
                    <a-select-option value="toggle-class">Toggle Class</a-select-option>
                    <a-select-option value="show">Show</a-select-option>
                    <a-select-option value="hide">Hide</a-select-option>
                  </a-select>
                </div>
                <div class="setting-group">
                  <label class="setting-label">Target</label>
                  <a-input :value="ix.target" size="small" placeholder="self or CSS selector" @change="updateInteraction(index, 'target', $event.target.value)" />
                </div>
                <div v-if="ix.action === 'animate'" class="setting-group">
                  <label class="setting-label">Animation Class</label>
                  <a-select :value="ix.animationClass || 'lume-ix-fade-in'" size="small" style="width: 100%" @change="updateInteraction(index, 'animationClass', $event)">
                    <a-select-option value="lume-ix-fade-in">Fade In</a-select-option>
                    <a-select-option value="lume-ix-slide-up">Slide Up</a-select-option>
                    <a-select-option value="lume-ix-slide-down">Slide Down</a-select-option>
                    <a-select-option value="lume-ix-zoom-in">Zoom In</a-select-option>
                    <a-select-option value="lume-ix-bounce">Bounce</a-select-option>
                    <a-select-option value="lume-ix-shake">Shake</a-select-option>
                    <a-select-option value="lume-ix-pulse">Pulse</a-select-option>
                  </a-select>
                </div>
                <div v-if="ix.action === 'toggle-class'" class="setting-group">
                  <label class="setting-label">Class Name</label>
                  <a-input :value="ix.className" size="small" placeholder="my-class" @change="updateInteraction(index, 'className', $event.target.value)" />
                </div>
              </div>
            </div>
            <button class="repeater-add-btn" @click="addInteraction">
              <Plus :size="14" />
              Add Interaction
            </button>
          </div>
        </div>

        <!-- Standard section rendering -->
        <div v-else class="settings-section">
          <!-- Display Conditions (shown at bottom of advanced section) -->
          <div v-if="section === 'advanced'" class="setting-group">
            <label class="setting-label">Display Conditions</label>
            <DisplayConditionBuilder
              :model-value="props.values.displayConditions || ''"
              @update:model-value="handleChange('displayConditions', $event)"
            />
          </div>

          <div
            v-for="attr in sectionAttributes[section]"
            v-show="isAttrVisible(attr)"
            :key="attr.key"
            class="setting-group"
          >
            <label class="setting-label">{{ attr.label }}</label>

            <!-- Text input -->
            <a-input
              v-if="attr.type === 'text'"
              :value="values[attr.key]"
              size="small"
              @change="handleChange(attr.key, $event.target.value)"
            />

            <!-- Textarea -->
            <a-textarea
              v-else-if="attr.type === 'textarea'"
              :value="values[attr.key]"
              size="small"
              :rows="3"
              @change="handleChange(attr.key, $event.target.value)"
            />

            <!-- Number input -->
            <a-input-number
              v-else-if="attr.type === 'number'"
              :value="values[attr.key]"
              size="small"
              :min="attr.min"
              :max="attr.max"
              :step="attr.step || 1"
              style="width: 100%"
              @change="handleChange(attr.key, $event)"
            />

            <!-- Slider -->
            <a-slider
              v-else-if="attr.type === 'slider'"
              :value="values[attr.key]"
              :min="attr.min || 0"
              :max="attr.max || 100"
              :step="attr.step || 1"
              @change="handleChange(attr.key, $event)"
            />

            <!-- Color picker -->
            <a-input
              v-else-if="attr.type === 'color'"
              :value="values[attr.key]"
              type="color"
              size="small"
              @change="handleChange(attr.key, $event.target.value)"
            />

            <!-- Select dropdown -->
            <a-select
              v-else-if="attr.type === 'select'"
              :value="values[attr.key]"
              size="small"
              style="width: 100%"
              @change="handleChange(attr.key, $event)"
            >
              <a-select-option
                v-for="option in attr.options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </a-select>

            <!-- Switch -->
            <a-switch
              v-else-if="attr.type === 'switch'"
              :checked="values[attr.key]"
              size="small"
              @change="handleChange(attr.key, $event)"
            />

            <!-- Image input with preview -->
            <div v-else-if="attr.type === 'image'">
              <a-input
                :value="values[attr.key]"
                size="small"
                placeholder="https://..."
                @change="handleChange(attr.key, $event.target.value)"
              />
              <img
                v-if="values[attr.key]"
                :src="values[attr.key]"
                class="image-preview"
                alt="Preview"
              />
            </div>

            <!-- URL input -->
            <a-input
              v-else-if="attr.type === 'url'"
              :value="values[attr.key]"
              size="small"
              placeholder="https://..."
              @change="handleChange(attr.key, $event.target.value)"
            />

            <!-- Alignment buttons -->
            <div v-else-if="attr.type === 'alignment'" class="alignment-group">
              <button
                :class="['alignment-btn', { active: values[attr.key] === 'left' }]"
                @click="handleChange(attr.key, 'left')"
              >
                <AlignLeft :size="16" />
              </button>
              <button
                :class="['alignment-btn', { active: values[attr.key] === 'center' }]"
                @click="handleChange(attr.key, 'center')"
              >
                <AlignCenter :size="16" />
              </button>
              <button
                :class="['alignment-btn', { active: values[attr.key] === 'right' }]"
                @click="handleChange(attr.key, 'right')"
              >
                <AlignRight :size="16" />
              </button>
            </div>

            <!-- Date picker -->
            <a-date-picker
              v-else-if="attr.type === 'date'"
              :value="values[attr.key]"
              size="small"
              style="width: 100%"
              @change="handleChange(attr.key, $event)"
            />

            <!-- Spacing inputs -->
            <div v-else-if="attr.type === 'spacing'" class="spacing-group">
              <a-input-number
                :value="parseSpacing(values[attr.key])[0]"
                size="small"
                placeholder="Top"
                @change="handleSpacingChange(attr.key, 0, $event)"
              />
              <a-input-number
                :value="parseSpacing(values[attr.key])[1]"
                size="small"
                placeholder="Right"
                @change="handleSpacingChange(attr.key, 1, $event)"
              />
              <a-input-number
                :value="parseSpacing(values[attr.key])[2]"
                size="small"
                placeholder="Bottom"
                @change="handleSpacingChange(attr.key, 2, $event)"
              />
              <a-input-number
                :value="parseSpacing(values[attr.key])[3]"
                size="small"
                placeholder="Left"
                @change="handleSpacingChange(attr.key, 3, $event)"
              />
            </div>

            <!-- Repeater -->
            <div v-else-if="attr.type === 'repeater'" class="repeater-group">
              <div
                v-for="(item, index) in (values[attr.key] || [])"
                :key="index"
                class="repeater-item"
              >
                <div class="repeater-item-header">
                  <span class="repeater-item-title">Item {{ index + 1 }}</span>
                  <button class="repeater-delete-btn" @click="handleRepeaterDelete(attr.key, index)">
                    <Trash2 :size="14" />
                  </button>
                </div>
                <div class="repeater-item-content">
                  <div
                    v-for="childAttr in attr.children"
                    :key="childAttr.key"
                    class="setting-group"
                  >
                    <label class="setting-label">{{ childAttr.label }}</label>
                    <a-input
                      v-if="childAttr.type === 'text'"
                      :value="item[childAttr.key]"
                      size="small"
                      @change="handleRepeaterChange(attr.key, index, childAttr.key, $event.target.value)"
                    />
                    <a-textarea
                      v-else-if="childAttr.type === 'textarea'"
                      :value="item[childAttr.key]"
                      size="small"
                      :rows="2"
                      @change="handleRepeaterChange(attr.key, index, childAttr.key, $event.target.value)"
                    />
                    <a-input-number
                      v-else-if="childAttr.type === 'number'"
                      :value="item[childAttr.key]"
                      size="small"
                      style="width: 100%"
                      @change="handleRepeaterChange(attr.key, index, childAttr.key, $event)"
                    />
                    <a-input
                      v-else-if="childAttr.type === 'image'"
                      :value="item[childAttr.key]"
                      size="small"
                      placeholder="https://..."
                      @change="handleRepeaterChange(attr.key, index, childAttr.key, $event.target.value)"
                    />
                    <a-input
                      v-else-if="childAttr.type === 'url'"
                      :value="item[childAttr.key]"
                      size="small"
                      placeholder="https://..."
                      @change="handleRepeaterChange(attr.key, index, childAttr.key, $event.target.value)"
                    />
                  </div>
                </div>
              </div>
              <button class="repeater-add-btn" @click="handleRepeaterAdd(attr)">
                <Plus :size="14" />
                Add Item
              </button>
            </div>

            <!-- Gradient builder -->
            <div v-else-if="attr.type === 'gradient'" class="gradient-builder">
              <div class="setting-row">
                <span class="setting-sub-label">Type</span>
                <a-select :value="parseGradient(values[attr.key]).type" size="small" style="width: 100px" @change="updateGradient(attr.key, 'type', $event)">
                  <a-select-option value="linear">Linear</a-select-option>
                  <a-select-option value="radial">Radial</a-select-option>
                </a-select>
              </div>
              <div v-if="parseGradient(values[attr.key]).type === 'linear'" class="setting-row">
                <span class="setting-sub-label">Angle (°)</span>
                <a-slider :value="parseGradient(values[attr.key]).angle" :min="0" :max="360" :step="5" style="flex:1" @change="updateGradient(attr.key, 'angle', $event)" />
              </div>
              <div v-for="(stop, si) in parseGradient(values[attr.key]).stops" :key="si" class="gradient-stop-row">
                <a-input :value="stop.color" type="color" size="small" style="width: 36px; padding: 2px 4px" @change="updateGradientStop(attr.key, si, 'color', $event.target.value)" />
                <a-slider :value="stop.position" :min="0" :max="100" :step="1" style="flex:1" @change="updateGradientStop(attr.key, si, 'position', $event)" />
                <span class="gradient-stop-pos">{{ stop.position }}%</span>
                <button class="icon-btn-sm" :disabled="parseGradient(values[attr.key]).stops.length <= 2" @click="removeGradientStop(attr.key, si)"><Trash2 :size="12" /></button>
              </div>
              <button class="repeater-add-btn" @click="addGradientStop(attr.key)"><Plus :size="12" /> Add Stop</button>
            </div>

            <!-- Typography group -->
            <div v-else-if="attr.type === 'typography'" class="typography-group">
              <div class="setting-row">
                <span class="setting-sub-label">Family</span>
                <a-input :value="parseTypography(values[attr.key]).family" size="small" placeholder="Arial, sans-serif" @change="updateTypography(attr.key, 'family', $event.target.value)" />
              </div>
              <div class="setting-row">
                <span class="setting-sub-label">Size (px)</span>
                <a-slider :value="parseTypography(values[attr.key]).size" :min="8" :max="120" :step="1" style="flex:1" @change="updateTypography(attr.key, 'size', $event)" />
                <span class="unit-label">{{ parseTypography(values[attr.key]).size }}px</span>
              </div>
              <div class="setting-row">
                <span class="setting-sub-label">Weight</span>
                <a-select :value="parseTypography(values[attr.key]).weight" size="small" style="width: 100%" @change="updateTypography(attr.key, 'weight', $event)">
                  <a-select-option v-for="w in ['100','200','300','400','500','600','700','800','900']" :key="w" :value="w">{{ w }}</a-select-option>
                </a-select>
              </div>
              <div class="setting-row">
                <span class="setting-sub-label">Style</span>
                <a-select :value="parseTypography(values[attr.key]).style" size="small" style="width: 100%" @change="updateTypography(attr.key, 'style', $event)">
                  <a-select-option value="normal">Normal</a-select-option>
                  <a-select-option value="italic">Italic</a-select-option>
                </a-select>
              </div>
              <div class="setting-row">
                <span class="setting-sub-label">Line Height</span>
                <a-slider :value="parseTypography(values[attr.key]).lineHeight" :min="0.8" :max="3" :step="0.1" style="flex:1" @change="updateTypography(attr.key, 'lineHeight', $event)" />
                <span class="unit-label">{{ parseTypography(values[attr.key]).lineHeight }}</span>
              </div>
              <div class="setting-row">
                <span class="setting-sub-label">Spacing (px)</span>
                <a-slider :value="parseTypography(values[attr.key]).letterSpacing" :min="-5" :max="20" :step="0.5" style="flex:1" @change="updateTypography(attr.key, 'letterSpacing', $event)" />
                <span class="unit-label">{{ parseTypography(values[attr.key]).letterSpacing }}</span>
              </div>
            </div>

            <!-- Border builder -->
            <div v-else-if="attr.type === 'border'" class="border-group">
              <div class="setting-row">
                <span class="setting-sub-label">Width (px)</span>
                <a-slider :value="parseBorder(values[attr.key]).width" :min="0" :max="20" :step="1" style="flex:1" @change="updateBorder(attr.key, 'width', $event)" />
                <span class="unit-label">{{ parseBorder(values[attr.key]).width }}px</span>
              </div>
              <div class="setting-row">
                <span class="setting-sub-label">Style</span>
                <a-select :value="parseBorder(values[attr.key]).style" size="small" style="width: 100%" @change="updateBorder(attr.key, 'style', $event)">
                  <a-select-option value="solid">Solid</a-select-option>
                  <a-select-option value="dashed">Dashed</a-select-option>
                  <a-select-option value="dotted">Dotted</a-select-option>
                  <a-select-option value="double">Double</a-select-option>
                  <a-select-option value="none">None</a-select-option>
                </a-select>
              </div>
              <div class="setting-row">
                <span class="setting-sub-label">Color</span>
                <a-input :value="parseBorder(values[attr.key]).color" type="color" size="small" style="width: 36px; padding: 2px 4px" @change="updateBorder(attr.key, 'color', $event.target.value)" />
                <a-input :value="parseBorder(values[attr.key]).color" size="small" style="flex:1; margin-left: 6px" @change="updateBorder(attr.key, 'color', $event.target.value)" />
              </div>
              <div class="setting-row">
                <span class="setting-sub-label">Radius</span>
                <a-input :value="parseBorder(values[attr.key]).radius" size="small" placeholder="4px or 4px 8px 4px 8px" @change="updateBorder(attr.key, 'radius', $event.target.value)" />
              </div>
            </div>

            <!-- Shadow builder -->
            <div v-else-if="attr.type === 'shadow'" class="shadow-group">
              <div class="shadow-preview" :style="{ boxShadow: shadowCssPreview(values[attr.key]) }"></div>
              <div class="setting-row"><span class="setting-sub-label">X</span><a-slider :value="parseShadow(values[attr.key]).x" :min="-50" :max="50" :step="1" style="flex:1" @change="updateShadow(attr.key, 'x', $event)" /><span class="unit-label">{{ parseShadow(values[attr.key]).x }}px</span></div>
              <div class="setting-row"><span class="setting-sub-label">Y</span><a-slider :value="parseShadow(values[attr.key]).y" :min="-50" :max="50" :step="1" style="flex:1" @change="updateShadow(attr.key, 'y', $event)" /><span class="unit-label">{{ parseShadow(values[attr.key]).y }}px</span></div>
              <div class="setting-row"><span class="setting-sub-label">Blur</span><a-slider :value="parseShadow(values[attr.key]).blur" :min="0" :max="100" :step="1" style="flex:1" @change="updateShadow(attr.key, 'blur', $event)" /><span class="unit-label">{{ parseShadow(values[attr.key]).blur }}px</span></div>
              <div class="setting-row"><span class="setting-sub-label">Spread</span><a-slider :value="parseShadow(values[attr.key]).spread" :min="-20" :max="50" :step="1" style="flex:1" @change="updateShadow(attr.key, 'spread', $event)" /><span class="unit-label">{{ parseShadow(values[attr.key]).spread }}px</span></div>
              <div class="setting-row">
                <span class="setting-sub-label">Color</span>
                <a-input :value="parseShadow(values[attr.key]).color" size="small" placeholder="rgba(0,0,0,0.15)" @change="updateShadow(attr.key, 'color', $event.target.value)" />
              </div>
              <div class="setting-row">
                <span class="setting-sub-label">Inset</span>
                <a-switch :checked="parseShadow(values[attr.key]).inset" size="small" @change="updateShadow(attr.key, 'inset', $event)" />
              </div>
            </div>

            <!-- Icon picker -->
            <div v-else-if="attr.type === 'icon'" class="icon-picker-field">
              <button class="icon-picker-btn" @click="openIconPicker(attr.key)">
                <Smile :size="14" />
                <span>{{ values[attr.key] || 'Select Icon' }}</span>
              </button>
              <IconPicker
                v-if="iconPickerOpenKey === attr.key"
                :model-value="values[attr.key]"
                @update:model-value="handleIconSelect(attr.key, $event)"
                @close="closeIconPicker"
              />
            </div>

            <!-- Link builder -->
            <div v-else-if="attr.type === 'link-builder'" class="link-builder-group">
              <a-input :value="parseLinkBuilder(values[attr.key]).url" size="small" placeholder="https://..." @change="updateLinkBuilder(attr.key, 'url', $event.target.value)" />
              <a-input :value="parseLinkBuilder(values[attr.key]).title" size="small" placeholder="Link title (optional)" style="margin-top: 4px" @change="updateLinkBuilder(attr.key, 'title', $event.target.value)" />
              <div class="setting-row" style="margin-top: 6px">
                <span class="setting-sub-label">Target</span>
                <a-select :value="parseLinkBuilder(values[attr.key]).target" size="small" style="width: 140px" @change="updateLinkBuilder(attr.key, 'target', $event)">
                  <a-select-option value="_self">Same tab</a-select-option>
                  <a-select-option value="_blank">New tab</a-select-option>
                </a-select>
              </div>
              <div class="setting-row">
                <span class="setting-sub-label">Nofollow</span>
                <a-switch :checked="parseLinkBuilder(values[attr.key]).nofollow" size="small" @change="updateLinkBuilder(attr.key, 'nofollow', $event)" />
              </div>
            </div>

            <!-- Font picker -->
            <div v-else-if="attr.type === 'font'" class="font-picker-field">
              <a-input :value="values[attr.key]" size="small" placeholder="e.g. 'Inter', sans-serif" @change="handleChange(attr.key, $event.target.value)" />
              <div class="font-preview" :style="{ fontFamily: values[attr.key] || 'inherit', marginTop: '6px', fontSize: '13px', color: '#666' }">
                The quick brown fox jumps over the lazy dog
              </div>
            </div>

            <!-- Code editor -->
            <div v-else-if="attr.type === 'code-editor'" class="code-editor-field">
              <div class="code-editor-header">
                <span class="setting-sub-label">Code</span>
                <button class="icon-btn-sm" @click="toggleCodeExpand(attr.key)" :title="expandedCodeKeys.has(attr.key) ? 'Collapse' : 'Expand'">
                  <Maximize2 v-if="!expandedCodeKeys.has(attr.key)" :size="12" />
                  <Minimize2 v-else :size="12" />
                </button>
              </div>
              <a-textarea
                :value="values[attr.key]"
                :rows="expandedCodeKeys.has(attr.key) ? 16 : 6"
                :style="{ fontFamily: 'Consolas, Monaco, monospace', fontSize: '12px' }"
                @change="handleChange(attr.key, $event.target.value)"
              />
            </div>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- Single section without tabs -->
    <div v-else-if="visibleSections.length === 1" class="settings-section">
      <div
        v-for="attr in sectionAttributes[visibleSections[0]]"
        :key="attr.key"
        class="setting-group"
      >
        <label class="setting-label">{{ attr.label }}</label>

        <a-input v-if="attr.type === 'text'" :value="values[attr.key]" size="small" @change="handleChange(attr.key, $event.target.value)" />
        <a-textarea v-else-if="attr.type === 'textarea'" :value="values[attr.key]" size="small" :rows="3" @change="handleChange(attr.key, $event.target.value)" />
        <a-input-number v-else-if="attr.type === 'number'" :value="values[attr.key]" size="small" :min="attr.min" :max="attr.max" :step="attr.step || 1" style="width: 100%" @change="handleChange(attr.key, $event)" />
        <a-slider v-else-if="attr.type === 'slider'" :value="values[attr.key]" :min="attr.min || 0" :max="attr.max || 100" :step="attr.step || 1" @change="handleChange(attr.key, $event)" />
        <a-input v-else-if="attr.type === 'color'" :value="values[attr.key]" type="color" size="small" @change="handleChange(attr.key, $event.target.value)" />
        <a-select v-else-if="attr.type === 'select'" :value="values[attr.key]" size="small" style="width: 100%" @change="handleChange(attr.key, $event)">
          <a-select-option v-for="option in attr.options" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
        </a-select>
        <a-switch v-else-if="attr.type === 'switch'" :checked="values[attr.key]" size="small" @change="handleChange(attr.key, $event)" />
        <div v-else-if="attr.type === 'image'">
          <a-input :value="values[attr.key]" size="small" placeholder="https://..." @change="handleChange(attr.key, $event.target.value)" />
          <img v-if="values[attr.key]" :src="values[attr.key]" class="image-preview" alt="Preview" />
        </div>
        <a-input v-else-if="attr.type === 'url'" :value="values[attr.key]" size="small" placeholder="https://..." @change="handleChange(attr.key, $event.target.value)" />
        <div v-else-if="attr.type === 'alignment'" class="alignment-group">
          <button :class="['alignment-btn', { active: values[attr.key] === 'left' }]" @click="handleChange(attr.key, 'left')"><AlignLeft :size="16" /></button>
          <button :class="['alignment-btn', { active: values[attr.key] === 'center' }]" @click="handleChange(attr.key, 'center')"><AlignCenter :size="16" /></button>
          <button :class="['alignment-btn', { active: values[attr.key] === 'right' }]" @click="handleChange(attr.key, 'right')"><AlignRight :size="16" /></button>
        </div>
        <a-date-picker v-else-if="attr.type === 'date'" :value="values[attr.key]" size="small" style="width: 100%" @change="handleChange(attr.key, $event)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { AlignLeft, AlignCenter, AlignRight, Trash2, Plus, Monitor, Tablet, Smartphone, Move, MousePointer, Zap, Smile, Maximize2, Minimize2 } from 'lucide-vue-next';
import DisplayConditionBuilder from '../components/DisplayConditionBuilder.vue';
import IconPicker from '../components/IconPicker.vue';

interface AttrSchema {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'slider' | 'color' | 'select' | 'switch' | 'image' | 'url' | 'alignment' | 'spacing' | 'repeater' | 'date' | 'gradient' | 'typography' | 'border' | 'shadow' | 'icon' | 'link-builder' | 'font' | 'code-editor';
  section: 'content' | 'style' | 'advanced' | 'motion';
  options?: { value: string; label: string }[];
  default?: any;
  min?: number;
  max?: number;
  step?: number;
  children?: AttrSchema[];
  dependsOn?: { key: string; value: any | any[] };
}

const props = defineProps<{
  attributes: AttrSchema[];
  values: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update', key: string, value: any): void;
}>();

const activeSection = ref<string>('content');
const activeDevice = ref<'desktop' | 'tablet' | 'mobile'>('desktop');

const sectionLabels: Record<string, string> = {
  content: 'Content',
  style: 'Style',
  advanced: 'Advanced',
  motion: 'Motion',
};

// Responsive overrides — stored as JSON in 'responsiveOverrides' attr
const responsiveOverrides = computed(() => {
  const raw = props.values.responsiveOverrides;
  if (!raw || raw === '{}') return {};
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
});

function getEffectiveValue(key: string): any {
  if (activeDevice.value === 'desktop') return props.values[key];
  const overrides = responsiveOverrides.value[activeDevice.value] || {};
  return key in overrides ? overrides[key] : props.values[key];
}

function isOverridden(key: string): boolean {
  if (activeDevice.value === 'desktop') return false;
  const overrides = responsiveOverrides.value[activeDevice.value] || {};
  return key in overrides;
}

// Style-section attrs that support responsive overrides
const responsiveKeys = new Set([
  'alignment', 'fontSize', 'paddingTop', 'paddingBottom', 'maxWidth',
  'gap', 'columns', 'width', 'height', 'iconSize', 'size',
]);

function handleResponsiveChange(key: string, value: any) {
  if (activeDevice.value === 'desktop') {
    emit('update', key, value);
    return;
  }
  // Store as responsive override
  const current = { ...responsiveOverrides.value };
  if (!current[activeDevice.value]) current[activeDevice.value] = {};
  current[activeDevice.value][key] = value;
  emit('update', 'responsiveOverrides', JSON.stringify(current));
}

const sectionAttributes = computed(() => {
  const sections: Record<string, AttrSchema[]> = {
    content: [],
    style: [],
    advanced: [],
    motion: [],
  };

  // Internal attrs managed programmatically — hide from UI
  const hiddenKeys = new Set(['responsiveOverrides', 'displayConditions', 'motionFx', 'interactions']);

  props.attributes.forEach(attr => {
    if (hiddenKeys.has(attr.key)) return;
    if (sections[attr.section]) {
      sections[attr.section].push(attr);
    }
  });

  // Always inject motion section items (motionFx is JSON, handled by custom UI)
  sections.motion.push(
    { key: '_motionFxHeader', label: 'Scroll Effects', type: 'text', section: 'motion', default: '' },
  );

  return sections;
});

const visibleSections = computed(() => {
  return Object.keys(sectionAttributes.value).filter(section => {
    // Always show 'advanced' so DisplayConditionBuilder is accessible
    if (section === 'advanced') return true;
    return sectionAttributes.value[section].length > 0;
  });
});

const handleChange = (key: string, value: any) => {
  emit('update', key, value);
};

const parseSpacing = (value: string): number[] => {
  if (!value) return [0, 0, 0, 0];
  const parts = value.split(' ').map(v => parseInt(v) || 0);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return parts.slice(0, 4);
};

const handleSpacingChange = (key: string, index: number, value: number) => {
  const current = parseSpacing(props.values[key]);
  current[index] = value || 0;
  emit('update', key, current.join(' '));
};

const handleRepeaterAdd = (attr: AttrSchema) => {
  const current = props.values[attr.key] || [];
  const newItem: Record<string, any> = {};

  // Initialize with defaults from children schema
  attr.children?.forEach(child => {
    newItem[child.key] = child.default ?? '';
  });

  emit('update', attr.key, [...current, newItem]);
};

const handleRepeaterDelete = (key: string, index: number) => {
  const current = [...(props.values[key] || [])];
  current.splice(index, 1);
  emit('update', key, current);
};

const handleRepeaterChange = (key: string, index: number, childKey: string, value: any) => {
  const current = [...(props.values[key] || [])];
  current[index] = { ...current[index], [childKey]: value };
  emit('update', key, current);
};

// ---- Conditional field display ----
function isAttrVisible(attr: AttrSchema): boolean {
  if (!attr.dependsOn) return true;
  const depVal = props.values[attr.dependsOn.key];
  const expected = Array.isArray(attr.dependsOn.value) ? attr.dependsOn.value : [attr.dependsOn.value];
  return expected.includes(depVal);
}

// ---- Gradient helpers ----
function parseGradient(raw: string): { type: string; angle: number; stops: { color: string; position: number }[] } {
  try {
    const parsed = typeof raw === 'string' && raw ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch { /* ignore */ }
  return { type: 'linear', angle: 135, stops: [{ color: '#4096ff', position: 0 }, { color: '#0050b3', position: 100 }] };
}
function updateGradient(key: string, field: string, value: any) {
  const current = parseGradient(props.values[key]);
  (current as any)[field] = value;
  emit('update', key, JSON.stringify(current));
}
function updateGradientStop(key: string, index: number, field: string, value: any) {
  const current = parseGradient(props.values[key]);
  current.stops[index] = { ...current.stops[index], [field]: value };
  emit('update', key, JSON.stringify(current));
}
function addGradientStop(key: string) {
  const current = parseGradient(props.values[key]);
  current.stops.push({ color: '#ffffff', position: 50 });
  emit('update', key, JSON.stringify(current));
}
function removeGradientStop(key: string, index: number) {
  const current = parseGradient(props.values[key]);
  if (current.stops.length > 2) current.stops.splice(index, 1);
  emit('update', key, JSON.stringify(current));
}

// ---- Typography helpers ----
function parseTypography(raw: any): { family: string; size: number; weight: string; style: string; lineHeight: number; letterSpacing: number } {
  try {
    const parsed = typeof raw === 'string' && raw ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch { /* ignore */ }
  return { family: '', size: 16, weight: '400', style: 'normal', lineHeight: 1.5, letterSpacing: 0 };
}
function updateTypography(key: string, field: string, value: any) {
  const current = parseTypography(props.values[key]);
  (current as any)[field] = value;
  emit('update', key, JSON.stringify(current));
}

// ---- Border helpers ----
function parseBorder(raw: any): { width: number; style: string; color: string; radius: string } {
  try {
    const parsed = typeof raw === 'string' && raw ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch { /* ignore */ }
  return { width: 0, style: 'solid', color: '#d9d9d9', radius: '0' };
}
function updateBorder(key: string, field: string, value: any) {
  const current = parseBorder(props.values[key]);
  (current as any)[field] = value;
  emit('update', key, JSON.stringify(current));
}

// ---- Shadow helpers ----
function parseShadow(raw: any): { x: number; y: number; blur: number; spread: number; color: string; inset: boolean } {
  try {
    const parsed = typeof raw === 'string' && raw ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch { /* ignore */ }
  return { x: 0, y: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.15)', inset: false };
}
function updateShadow(key: string, field: string, value: any) {
  const current = parseShadow(props.values[key]);
  (current as any)[field] = value;
  emit('update', key, JSON.stringify(current));
}
function shadowCssPreview(raw: any): string {
  const s = parseShadow(raw);
  return `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`;
}

// ---- Link builder helpers ----
function parseLinkBuilder(raw: any): { url: string; title: string; target: string; nofollow: boolean } {
  try {
    const parsed = typeof raw === 'string' && raw ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch { /* ignore */ }
  return { url: '', title: '', target: '_self', nofollow: false };
}
function updateLinkBuilder(key: string, field: string, value: any) {
  const current = parseLinkBuilder(props.values[key]);
  (current as any)[field] = value;
  emit('update', key, JSON.stringify(current));
}

// ---- Icon picker state ----
const iconPickerOpenKey = ref<string | null>(null);
function openIconPicker(key: string) { iconPickerOpenKey.value = key; }
function closeIconPicker() { iconPickerOpenKey.value = null; }
function handleIconSelect(key: string, iconName: string) {
  emit('update', key, iconName);
  closeIconPicker();
}

// ---- Code editor expand state ----
const expandedCodeKeys = ref<Set<string>>(new Set());
function toggleCodeExpand(key: string) {
  const s = new Set(expandedCodeKeys.value);
  if (s.has(key)) s.delete(key); else s.add(key);
  expandedCodeKeys.value = s;
}

// ---- Motion FX helpers ----

const scrollEffectKeys = ['translateY', 'translateX', 'opacity', 'blur', 'rotate', 'scale'] as const;
const scrollEffectLabels: Record<string, string> = {
  translateY: 'Vertical Scroll',
  translateX: 'Horizontal Scroll',
  opacity: 'Fade',
  blur: 'Blur',
  rotate: 'Rotate',
  scale: 'Scale',
};

const mouseEffectKeys = ['mouseTrack', 'tilt'] as const;
const mouseEffectLabels: Record<string, string> = {
  mouseTrack: 'Mouse Track',
  tilt: '3D Tilt',
};

const parsedMotionFx = computed(() => {
  const raw = props.values.motionFx;
  if (!raw || raw === '{}') return { scrollEffects: {}, mouseEffects: {} };
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { scrollEffects: {}, mouseEffects: {} };
  }
});

function getScrollEffect(key: string): Record<string, any> {
  return parsedMotionFx.value.scrollEffects?.[key] || { enabled: false, speed: 5, direction: 'positive', range: { start: 0, end: 100 } };
}

function getMouseEffect(key: string): Record<string, any> {
  return parsedMotionFx.value.mouseEffects?.[key] || { enabled: false, speed: 5 };
}

function updateScrollEffect(effectKey: string, prop: string, value: any) {
  const current = { ...parsedMotionFx.value };
  if (!current.scrollEffects) current.scrollEffects = {};
  if (!current.scrollEffects[effectKey]) {
    current.scrollEffects[effectKey] = { enabled: false, speed: 5, direction: 'positive', range: { start: 0, end: 100 } };
  }
  current.scrollEffects[effectKey][prop] = value;
  emit('update', 'motionFx', JSON.stringify(current));
}

function updateScrollEffectRange(effectKey: string, prop: 'start' | 'end', value: number) {
  const current = { ...parsedMotionFx.value };
  if (!current.scrollEffects) current.scrollEffects = {};
  if (!current.scrollEffects[effectKey]) {
    current.scrollEffects[effectKey] = { enabled: false, speed: 5, direction: 'positive', range: { start: 0, end: 100 } };
  }
  if (!current.scrollEffects[effectKey].range) {
    current.scrollEffects[effectKey].range = { start: 0, end: 100 };
  }
  current.scrollEffects[effectKey].range[prop] = value;
  emit('update', 'motionFx', JSON.stringify(current));
}

function updateMouseEffect(effectKey: string, prop: string, value: any) {
  const current = { ...parsedMotionFx.value };
  if (!current.mouseEffects) current.mouseEffects = {};
  if (!current.mouseEffects[effectKey]) {
    current.mouseEffects[effectKey] = { enabled: false, speed: 5 };
  }
  current.mouseEffects[effectKey][prop] = value;
  emit('update', 'motionFx', JSON.stringify(current));
}

// ---- Interactions helpers ----

const parsedInteractions = computed(() => {
  const raw = props.values.interactions;
  if (!raw || raw === '[]') return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

function addInteraction() {
  const current = [...parsedInteractions.value];
  current.push({ trigger: 'hover', action: 'animate', target: 'self', animationClass: 'lume-ix-fade-in' });
  emit('update', 'interactions', JSON.stringify(current));
}

function removeInteraction(index: number) {
  const current = [...parsedInteractions.value];
  current.splice(index, 1);
  emit('update', 'interactions', JSON.stringify(current));
}

function updateInteraction(index: number, key: string, value: any) {
  const current = [...parsedInteractions.value];
  current[index] = { ...current[index], [key]: value };
  emit('update', 'interactions', JSON.stringify(current));
}
</script>

<style scoped>
.settings-renderer {
  width: 100%;
}

.device-toggle {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 6px 0 8px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 4px;
}

.device-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s;
}

.device-btn:hover {
  border-color: #4096ff;
  color: #4096ff;
}

.device-btn.active {
  border-color: #4096ff;
  background: #e6f4ff;
  color: #4096ff;
}

.settings-section {
  padding: 8px 0;
}

.setting-group {
  margin-bottom: 16px;
}

.setting-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
}

.image-preview {
  margin-top: 8px;
  max-width: 100%;
  max-height: 120px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.alignment-group {
  display: flex;
  gap: 4px;
}

.alignment-btn {
  flex: 1;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.alignment-btn:hover {
  border-color: #4096ff;
  color: #4096ff;
}

.alignment-btn.active {
  border-color: #4096ff;
  background: #e6f4ff;
  color: #4096ff;
}

.spacing-group {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.repeater-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.repeater-item {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 8px;
  background: #fafafa;
}

.repeater-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.repeater-item-title {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.repeater-delete-btn {
  padding: 4px;
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.repeater-delete-btn:hover {
  background: #fee2e2;
}

.repeater-item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.repeater-item-content .setting-group {
  margin-bottom: 0;
}

.repeater-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px dashed #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
  transition: all 0.2s;
}

.repeater-add-btn:hover {
  border-color: #4096ff;
  color: #4096ff;
}

/* Motion FX section styles */
.motion-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  padding: 8px 0 6px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.motion-effect-row {
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.motion-effect-row:last-child {
  border-bottom: none;
}

.motion-effect-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.motion-effect-name {
  font-size: 12px;
  font-weight: 500;
  color: #4b5563;
}

/* Phase 13 — Advanced control styles */
.setting-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.setting-sub-label {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
  min-width: 52px;
}

.unit-label {
  font-size: 11px;
  color: #9ca3af;
  min-width: 36px;
  text-align: right;
}

.gradient-builder,
.typography-group,
.border-group,
.shadow-group,
.link-builder-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.gradient-stop-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.gradient-stop-pos {
  font-size: 11px;
  color: #9ca3af;
  min-width: 30px;
}

.icon-btn-sm {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;
  flex-shrink: 0;
}

.icon-btn-sm:hover { border-color: #f87171; color: #ef4444; }
.icon-btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

.shadow-preview {
  width: 100%;
  height: 40px;
  background: #fff;
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #f0f0f0;
}

.icon-picker-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.icon-picker-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  transition: border-color 0.15s;
}

.icon-picker-btn:hover { border-color: #4096ff; color: #4096ff; }

.font-picker-field { display: flex; flex-direction: column; }

.code-editor-field { display: flex; flex-direction: column; gap: 4px; }

.code-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
