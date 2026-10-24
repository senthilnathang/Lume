import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import DataTable from '../common/DataTable.vue';

describe('DataTable keys and sorting', () => {
  it('preserves a zero ID when selecting a row', async () => {
    const onChange = vi.fn();
    const wrapper = mount(DataTable, { props: {
      columns: [{ key: 'name', title: 'Name' }],
      dataSource: [{ id: 8, name: 'First' }, { id: 0, name: 'Zero' }],
      rowSelection: { selectedRowKeys: [], onChange },
    } });
    await wrapper.findAll('tbody input')[1].setValue(true);
    expect(onChange).toHaveBeenCalledWith([0]);
    wrapper.unmount();
  });

  it('emits complete pagination defaults when sorting without pagination', async () => {
    const wrapper = mount(DataTable, { props: {
      columns: [{ key: 'name', title: 'Name', sorter: true }],
      dataSource: [{ id: 0, name: 'Zero' }],
    } });
    await wrapper.get('.sorter-wrapper').trigger('click');
    expect(wrapper.emitted('change')?.[0][0]).toMatchObject({
      current: 1, pageSize: 10, total: 1, sortField: 'name', sortOrder: 'ascend',
    });
    wrapper.unmount();
  });
});
