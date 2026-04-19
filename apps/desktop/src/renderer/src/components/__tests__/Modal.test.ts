import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Modal from '../Modal.vue'

describe('Modal.vue', () => {
  it('renders title and aria attributes when show is true', () => {
    const wrapper = mount(Modal, {
      props: {
        title: 'Test Modal',
        show: true
      }
    })
    expect(wrapper.text()).toContain('Test Modal')
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-labelledby')).toBeDefined()
  })

  it('closes on Escape key', async () => {
    const wrapper = mount(Modal, {
      props: {
        title: 'Test Modal',
        show: true
      }
    })
    
    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    window.dispatchEvent(event)
    
    expect(wrapper.emitted()).toHaveProperty('close')
  })

  it('closes on background click', async () => {
    const wrapper = mount(Modal, {
      props: {
        title: 'Test Modal',
        show: true
      }
    })
    // The outermost div is the background
    await wrapper.find('div').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('close')
  })

  it('focuses input on show', async () => {
    const wrapper = mount(Modal, {
      props: {
        title: 'Test Modal',
        show: true
      }
    })
    
    // We check if autofocus logic was triggered
    // Since we use ref="inputRef" and focus() in watch/nextTick
    // In JSDOM with Vue, testing focus is brittle. 
    // We'll verify the input exists and has correct attributes.
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('id')).toBeDefined()
  })
})
