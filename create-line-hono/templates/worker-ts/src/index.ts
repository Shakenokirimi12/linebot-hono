import { LineHono } from 'linebot-hono'

const app = new LineHono()

app.webhook('/')

app.text('ping', c => c.text('pong'))

export default app

