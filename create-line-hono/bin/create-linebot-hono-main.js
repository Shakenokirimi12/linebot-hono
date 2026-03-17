#!/usr/bin/env node
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PKG_ROOT = path.resolve(__dirname, '..')

const red = (s) => `\u001b[31m${s}\u001b[0m`

function usage() {
  return `create-linebot-hono

Usage:
  npm create linebot-hono@latest <dir>
  npx create-linebot-hono@latest <dir>
  pnpm create linebot-hono <dir>

Options:
  --yes           Use defaults (no prompts)
  --template      Template name (default: worker-ts)
`
}

function parseArgs(argv) {
  const args = [...argv]
  const out = { dir: undefined, yes: false, template: 'worker-ts' }
  while (args.length) {
    const a = args.shift()
    if (!a) break
    if (a === '--help' || a === '-h') return { ...out, help: true }
    if (a === '--yes' || a === '-y') {
      out.yes = true
      continue
    }
    if (a === '--template') {
      const v = args.shift()
      if (!v) throw new Error('--template requires a value')
      out.template = v
      continue
    }
    if (a.startsWith('-')) throw new Error(`Unknown option: ${a}`)
    if (!out.dir) out.dir = a
  }
  return out
}

async function pathExists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function copyTemplate(srcDir, destDir) {
  await cp(srcDir, destDir, { recursive: true })
}

async function listTemplates() {
  const templatesRoot = path.join(PKG_ROOT, 'templates')
  const entries = await readdir(templatesRoot, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2))
  if (parsed.help) {
    console.log(usage())
    process.exit(0)
  }

  const templates = await listTemplates()
  if (!templates.includes(parsed.template)) {
    console.error(red(`Unknown template: ${parsed.template}`))
    console.error(`Available templates: ${templates.join(', ')}`)
    process.exit(1)
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const cwd = process.cwd()

  let dir = parsed.dir
  if (!dir && !parsed.yes) {
    dir = (await rl.question('Project directory (e.g. my-bot): ')).trim()
  }
  if (!dir) {
    console.error(red('Directory is required.'))
    console.error(usage())
    process.exit(1)
  }

  const targetDir = path.resolve(cwd, dir)
  if (await pathExists(targetDir)) {
    console.error(red(`Directory already exists: ${targetDir}`))
    process.exit(1)
  }

  let packageName = path.basename(targetDir)
  if (!parsed.yes) {
    const ans = (await rl.question(`Package name (${packageName}): `)).trim()
    if (ans) packageName = ans
  }

  await mkdir(targetDir, { recursive: true })

  const templateDir = path.join(PKG_ROOT, 'templates', parsed.template)
  await copyTemplate(templateDir, targetDir)

  // Replace placeholder in template package.json
  const pkgPath = path.join(targetDir, 'package.json')
  const pkgRaw = await readFile(pkgPath, 'utf8')
  const pkg = pkgRaw.replaceAll('__PACKAGE_NAME__', packageName)
  await writeFile(pkgPath, pkg, 'utf8')

  // Replace placeholder in wrangler.toml
  const wranglerPath = path.join(targetDir, 'wrangler.toml')
  if (await pathExists(wranglerPath)) {
    const wRaw = await readFile(wranglerPath, 'utf8')
    const w = wRaw.replaceAll('__WORKER_NAME__', packageName)
    await writeFile(wranglerPath, w, 'utf8')
  }

  rl.close()

  console.log(`\nCreated ${packageName} in ${targetDir}\n`)
  console.log('Next steps:')
  console.log(`  cd ${dir}`)
  console.log('  pnpm i   # or npm i / yarn')
  console.log('  pnpm dev # local dev with wrangler')
  console.log('\nEnvironment variables:')
  console.log('  LINE_CHANNEL_SECRET')
  console.log('  LINE_CHANNEL_ACCESS_TOKEN\n')
}

main().catch((err) => {
  console.error(red(err?.stack || String(err)))
  process.exit(1)
})

