import { describe, expect, it, vi } from 'vitest'
import { Command } from '../builders'
import { LineHono } from '../line-hono'
import { createFactory } from './create-factory'
import type { HandlerWrapper } from './create-factory'

describe('createFactory', () => {
  const factory = createFactory()

  it('should create a LineHono instance', () => {
    const line = factory.line()
    expect(line).toBeInstanceOf(LineHono)
  })

  it('should create a command wrapper', () => {
    const handlerMock = vi.fn()
    const result = factory.command('name', 'description', handlerMock) as Extract<HandlerWrapper, { type: 'command' }>
    expect(result.type).toBe('command')
    expect(result.command.name).toBe('name')
    expect(result.command.description).toBe('description')
    expect(result.handler).toBe(handlerMock)
  })

  it('should create a component wrapper', () => {
    const handlerMock = vi.fn()
    const result = factory.component('str', 'label', handlerMock) as Extract<HandlerWrapper, { type: 'component' }>
    expect(result.type).toBe('component')
    expect(result.component.id).toBe('str')
    expect(result.component.label).toBe('label')
    expect(result.handler).toBe(handlerMock)
  })

  it('should create an autocomplete wrapper', () => {
    const commandMock = new Command('name', 'description')
    const autocompleteMock = vi.fn()
    const handlerMock = vi.fn()
    const result = factory.autocomplete(commandMock, autocompleteMock, handlerMock) as Extract<HandlerWrapper, { type: 'autocomplete' }>
    expect(result.type).toBe('autocomplete')
    expect(result.command).toBe(commandMock)
    expect(result.autocomplete).toBe(autocompleteMock)
    expect(result.handler).toBe(handlerMock)
  })

  it('should create a modal wrapper', () => {
    const handlerMock = vi.fn()
    const result = factory.modal('unique_id', 'title', handlerMock) as Extract<HandlerWrapper, { type: 'modal' }>
    expect(result.type).toBe('modal')
    expect(result.modal.id).toBe('unique_id')
    expect(result.modal.title).toBe('title')
    expect(result.handler).toBe(handlerMock)
  })

  it('should create a cron wrapper', () => {
    const cronExpression = '0 0 * * *'
    const handlerMock = vi.fn()
    const result = factory.cron(cronExpression, handlerMock)
    expect(result).toEqual({ type: 'cron', cron: cronExpression, handler: handlerMock })
  })

  it('should load handlers into LineHono instance', () => {
    const app = factory.line()
    const handlerMock = vi.fn()

    const handlers = [
      factory.command('name', 'description', handlerMock),
      factory.component('str', 'label', handlerMock),
      factory.modal('unique_id', 'title', handlerMock),
      factory.cron('0 0 * * *', handlerMock),
    ]

    vi.spyOn(app, 'command')
    vi.spyOn(app, 'component')
    vi.spyOn(app, 'modal')
    vi.spyOn(app, 'cron')

    app.loader(handlers)

    expect(app.command).toHaveBeenCalledWith('name', handlerMock)
    expect(app.component).toHaveBeenCalledWith('str', handlerMock)
    expect(app.modal).toHaveBeenCalledWith('unique_id', handlerMock)
    expect(app.cron).toHaveBeenCalledWith('0 0 * * *', handlerMock)
  })

  it('should throw an error for unknown wrapper type', () => {
    const app = factory.line()
    expect(() => app.loader([{ unknownProp: 'value' } as any])).toThrow()
  })

  it('should return a list of commands', () => {
    const handlers = [factory.command('name', 'description', vi.fn())]
    const commands = factory.getCommands(handlers)
    expect(commands[0]?.name).toBe('name')
  })
})
