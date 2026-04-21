import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Header from '../Header.vue'

describe('Header Component', () => {
  it('renders header element', () => {
    const wrapper = mount(Header, {
      props: {
        userName: 'John Doe',
        userRole: 'Admin',
        userEmail: 'john@example.com',
      },
      global: {
        stubs: {
          Breadcrumb: true,
          CommandPalette: true,
          NotificationCenter: true,
        },
      },
    })

    expect(wrapper.find('header.lume-header').exists()).toBe(true)
  })

  it('emits toggle-sidebar event', async () => {
    const wrapper = mount(Header, {
      props: {
        userName: 'John Doe',
        userRole: 'Admin',
        userEmail: 'john@example.com',
      },
      global: {
        stubs: {
          Breadcrumb: true,
          CommandPalette: true,
          NotificationCenter: true,
        },
      },
    })

    const menuToggle = wrapper.find('.lume-menu-toggle')
    await menuToggle.trigger('click')

    expect(wrapper.emitted('toggle-sidebar')).toBeTruthy()
  })

  it('displays user information', () => {
    const wrapper = mount(Header, {
      props: {
        userName: 'John Doe',
        userRole: 'Admin',
        userEmail: 'john@example.com',
      },
      global: {
        stubs: {
          Breadcrumb: true,
          CommandPalette: true,
          NotificationCenter: true,
        },
      },
    })

    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('Admin')
  })
})
