import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from '@testing-library/react'
import App from '../../src/panel/App'
import { useInspectorStore } from '../../src/panel/store/useInspectorStore'
import { EMPTY_FILTER } from '../../src/core/filter'
import { clearRaw } from '../../src/panel/rawEntries'
import { emitRequest, entry } from '../helpers/chromeMock'

beforeEach(() => {
  clearRaw()
  useInspectorStore.setState({
    requests: [],
    selectedId: null,
    selectedIds: [],
    paused: false,
    maskEnabled: true,
    filter: EMPTY_FILTER,
    resBodies: {},
    diffBaseId: null,
    diffCompareId: null,
  })
})

afterEach(() => cleanup())

describe('panel capture', () => {
  it('shows the empty state before any request', () => {
    render(<App />)
    expect(screen.getByText('No requests captured yet.')).toBeInTheDocument()
  })

  it('renders a row when a request is captured', () => {
    render(<App />)
    act(() => emitRequest(entry({ url: 'https://api.example.com/v1/users?page=2' })))
    expect(screen.getByText('/v1/users?page=2')).toBeInTheDocument()
  })

  it('hides static assets by default', () => {
    render(<App />)
    act(() => {
      emitRequest(entry({ url: 'https://api.example.com/v1/users' }))
      emitRequest(entry({ url: 'https://api.example.com/a.png', type: 'image' }))
    })
    expect(screen.getByText('/v1/users')).toBeInTheDocument()
    expect(screen.queryByText('/a.png')).not.toBeInTheDocument()
  })
})

describe('panel masking', () => {
  it('masks sensitive headers and reveals them when toggled off', () => {
    render(<App />)
    act(() =>
      emitRequest(
        entry({
          method: 'POST',
          url: 'https://api.example.com/v1/login',
          reqHeaders: { Authorization: 'Bearer supersecrettoken123' },
        }),
      ),
    )
    fireEvent.click(screen.getByText('/v1/login'))
    expect(screen.getByText('masked')).toBeInTheDocument()
    expect(
      screen.queryByText('Bearer supersecrettoken123'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Mask sensitive headers'))
    expect(screen.getByText('Bearer supersecrettoken123')).toBeInTheDocument()
    expect(screen.queryByText('masked')).not.toBeInTheDocument()
  })
})

describe('panel filtering', () => {
  it('filters the list by url regex', () => {
    render(<App />)
    act(() => {
      emitRequest(entry({ url: 'https://api.example.com/v1/users' }))
      emitRequest(entry({ method: 'POST', url: 'https://api.example.com/v1/login' }))
    })
    expect(screen.getByText('/v1/users')).toBeInTheDocument()
    expect(screen.getByText('/v1/login')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('filter (regex)'), {
      target: { value: 'login' },
    })
    expect(screen.queryByText('/v1/users')).not.toBeInTheDocument()
    expect(screen.getByText('/v1/login')).toBeInTheDocument()
  })
})

describe('panel convert', () => {
  it('renders cURL and copies it to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(<App />)
    act(() =>
      emitRequest(
        entry({
          method: 'POST',
          url: 'https://api.example.com/v1/login',
          postJson: '{"u":"a"}',
        }),
      ),
    )
    fireEvent.click(screen.getByText('/v1/login'))
    fireEvent.click(screen.getByText('Convert'))

    expect(screen.getByText(/curl '/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('copy'))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText.mock.calls[0][0]).toContain('curl')
  })
})

describe('panel response body', () => {
  it('lazy loads and pretty-prints the response body', async () => {
    render(<App />)
    act(() =>
      emitRequest(
        entry({ url: 'https://api.example.com/v1/users', resText: '{"id":99}' }),
      ),
    )
    fireEvent.click(screen.getByText('/v1/users'))
    fireEvent.click(screen.getByText('Body'))

    await waitFor(() =>
      expect(screen.getByText(/"id": 99/)).toBeInTheDocument(),
    )
  })
})

describe('panel multi-select', () => {
  it('shift+click selects a range and Ctrl+C copies the titles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(<App />)
    act(() => {
      emitRequest(entry({ url: 'https://api.example.com/a' }))
      emitRequest(entry({ url: 'https://api.example.com/b' }))
      emitRequest(entry({ url: 'https://api.example.com/c' }))
    })

    fireEvent.click(screen.getByText('/a'))
    fireEvent.click(screen.getByText('/c'), { shiftKey: true })
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true })

    await waitFor(() => expect(writeText).toHaveBeenCalled())
    const copied = writeText.mock.calls[0][0] as string
    expect(copied.split('\n')).toHaveLength(3)
    expect(copied).toContain('https://api.example.com/a')
    expect(copied).toContain('https://api.example.com/c')
  })
})
