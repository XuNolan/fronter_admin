import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 启动开发环境...\n');

// 启动Vite开发服务器
const viteProcess = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'pipe',
    shell: true
});

// 启动Express服务器
const serverProcess = spawn('npm', ['run', 'server'], {
    cwd: __dirname,
    stdio: 'pipe',
    shell: true
});

// 处理Vite输出
viteProcess.stdout.on('data', (data) => {
    console.log(`[Vite] ${data.toString().trim()}`);
});

viteProcess.stderr.on('data', (data) => {
    console.error(`[Vite Error] ${data.toString().trim()}`);
});

// 处理Express输出
serverProcess.stdout.on('data', (data) => {
    console.log(`[Server] ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data.toString().trim()}`);
});

// 处理进程退出
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    viteProcess.kill();
    serverProcess.kill();
    process.exit(0);
});

// 处理子进程退出
viteProcess.on('exit', (code) => {
    console.log(`Vite进程退出，代码: ${code}`);
});

serverProcess.on('exit', (code) => {
    console.log(`Server进程退出，代码: ${code}`);
});
