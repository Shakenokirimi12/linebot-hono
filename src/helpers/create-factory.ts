import { LineHono } from '../line-hono'
import { Command, Button, Modal } from '../builders'

export type HandlerWrapper = 
  | { type: 'command'; command: Command; handler: Function }
  | { type: 'component'; component: Button; handler: Function }
  | { type: 'autocomplete'; command: Command; autocomplete: Function; handler: Function }
  | { type: 'modal'; modal: Modal; handler: Function }
  | { type: 'cron'; cron: string; handler: Function }

export const createFactory = () => {
  return {
    line: () => new LineHono(),
    command: (name: string, description: string, handler: Function): HandlerWrapper => ({ 
      type: 'command', command: new Command(name, description), handler 
    }),
    component: (id: string, label: string, handler: Function): HandlerWrapper => ({ 
      type: 'component', component: new Button(id, label), handler 
    }),
    autocomplete: (command: Command, autocomplete: Function, handler: Function): HandlerWrapper => ({ 
      type: 'autocomplete', command, autocomplete, handler 
    }),
    modal: (id: string, title: string, handler: Function): HandlerWrapper => ({ 
      type: 'modal', modal: new Modal(id, title), handler 
    }),
    cron: (cron: string, handler: Function): HandlerWrapper => ({ type: 'cron', cron, handler }),
    getCommands: (handlers: HandlerWrapper[]) => {
      return handlers.filter((h): h is Extract<HandlerWrapper, { type: 'command' }> => h.type === 'command').map(h => h.command)
    }
  }
}
