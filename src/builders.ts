export class Command {
  name: string
  description: string
  constructor(name: string, description: string) {
    this.name = name
    this.description = description
  }
}

export class Button {
  id: string
  label: string
  constructor(id: string, label: string) {
    this.id = id
    this.label = label
  }
}

export class Modal {
  id: string
  title: string
  constructor(id: string, title: string) {
    this.id = id
    this.title = title
  }
}
