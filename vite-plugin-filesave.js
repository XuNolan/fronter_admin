import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// 编译C项目的函数
async function compileCProject(projectPath) {
    return new Promise(async (resolve, reject) => {
        try {
            // 检查项目路径是否存在
            await fs.access(projectPath);
            
            // 检查是否存在Makefile
            const makefilePath = path.join(projectPath, 'Makefile');
            const cmakePath = path.join(projectPath, 'CMakeLists.txt');
            
            let compileCommand, compileArgs;
            
            try {
                await fs.access(makefilePath);
                // 使用Makefile编译
                compileCommand = 'make';
                compileArgs = ['-C', projectPath];
                console.log('使用Makefile编译');
            } catch (makeError) {
                try {
                    await fs.access(cmakePath);
                    // 使用CMake编译
                    compileCommand = 'cmake';
                    compileArgs = ['--build', projectPath];
                    console.log('使用CMake编译');
                } catch (cmakeError) {
                    // 尝试使用gcc编译所有.c文件
                    compileCommand = 'gcc';
                    compileArgs = ['-o', 'main', '*.c'];
                    console.log('使用GCC编译所有.c文件');
                }
            }
            
            console.log(`执行编译命令: ${compileCommand} ${compileArgs.join(' ')}`);
            
            const compileProcess = spawn(compileCommand, compileArgs, {
                cwd: projectPath,
                shell: true,
                stdio: 'pipe'
            });
            
            let output = '';
            let errorOutput = '';
            
            compileProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            compileProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            compileProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        output: output,
                        error: errorOutput
                    });
                } else {
                    reject(new Error(`编译失败，退出码: ${code}\n错误输出: ${errorOutput}`));
                }
            });
            
            compileProcess.on('error', (error) => {
                reject(new Error(`编译进程启动失败: ${error.message}`));
            });
            
        } catch (error) {
            reject(new Error(`项目路径检查失败: ${error.message}`));
        }
    });
}

export function fileSavePlugin() {
    return {
        name: 'file-save-plugin',
        configureServer(server) {
            // 添加中间件处理文件保存请求
            server.middlewares.use('/api/save-config', async (req, res, next) => {
                if (req.method === 'POST') {
                    try {
                        let body = '';
                        req.on('data', chunk => {
                            body += chunk.toString();
                        });
                        
                        req.on('end', async () => {
                            try {
                                const configData = JSON.parse(body);
                                const configJson = JSON.stringify(configData, null, 2);
                                
                                // 保存到项目根目录的config.json
                                const configPath = path.join(process.cwd(), 'config.json');
                                await fs.writeFile(configPath, configJson, 'utf8');
                                
                                console.log('配置文件已保存到:', configPath);
                                res.setHeader('Content-Type', 'application/json');
                                res.setHeader('Access-Control-Allow-Origin', '*');
                                res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
                                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                                res.end(JSON.stringify({ success: true, message: '配置文件保存成功' }));
                            } catch (error) {
                                console.error('保存配置文件失败:', error);
                                res.setHeader('Content-Type', 'application/json');
                                res.setHeader('Access-Control-Allow-Origin', '*');
                                res.statusCode = 500;
                                res.end(JSON.stringify({ success: false, message: '保存配置文件失败: ' + error.message }));
                            }
                        });
                    } catch (error) {
                        console.error('处理请求失败:', error);
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 500;
                        res.end(JSON.stringify({ success: false, message: '处理请求失败: ' + error.message }));
                    }
                } else {
                    next();
                }
            });

            // 添加中间件处理文件读取请求
            server.middlewares.use('/api/get-config', async (req, res, next) => {
                if (req.method === 'GET') {
                    try {
                        const configPath = path.join(process.cwd(), 'config.json');
                        const configData = await fs.readFile(configPath, 'utf8');
                        const config = JSON.parse(configData);
                        
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.end(JSON.stringify(config));
                    } catch (error) {
                        if (error.code === 'ENOENT') {
                            res.setHeader('Content-Type', 'application/json');
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            res.statusCode = 404;
                            res.end(JSON.stringify({ success: false, message: '配置文件不存在' }));
                        } else {
                            console.error('读取配置文件失败:', error);
                            res.setHeader('Content-Type', 'application/json');
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            res.statusCode = 500;
                            res.end(JSON.stringify({ success: false, message: '读取配置文件失败: ' + error.message }));
                        }
                    }
                } else {
                    next();
                }
            });

            // 添加编译项目的API
            server.middlewares.use('/api/compile', async (req, res, next) => {
                if (req.method === 'POST') {
                    try {
                        let body = '';
                        req.on('data', chunk => {
                            body += chunk.toString();
                        });
                        
                        req.on('end', async () => {
                            try {
                                const { configData, cProjectPath, configFileName = 'config.json' } = JSON.parse(body);
                                
                                // 确保C项目路径存在
                                if (!cProjectPath) {
                                    throw new Error('C项目路径不能为空');
                                }
                                
                                // 解析目标目录路径
                                let targetDir;
                                if (path.isAbsolute(cProjectPath)) {
                                    // 绝对路径
                                    targetDir = cProjectPath;
                                } else {
                                    // 相对路径，相对于当前工作目录
                                    targetDir = path.resolve(process.cwd(), cProjectPath);
                                }
                                
                                console.log(`目标C项目路径: ${targetDir}`);
                                
                                // 检查目标目录是否存在，如果不存在则创建
                                try {
                                    await fs.access(targetDir);
                                    console.log('目标目录已存在');
                                } catch (error) {
                                    console.log('目标目录不存在，正在创建...');
                                    await fs.mkdir(targetDir, { recursive: true });
                                    console.log('目标目录创建成功');
                                }
                                
                                // 保存配置文件到C项目目录
                                const configPath = path.join(targetDir, configFileName);
                                const configJson = JSON.stringify(configData, null, 2);
                                await fs.writeFile(configPath, configJson, 'utf8');
                                
                                console.log(`配置文件已保存到C项目: ${configPath}`);
                                
                                // 编译C项目
                                const compileResult = await compileCProject(targetDir);
                                
                                res.setHeader('Content-Type', 'application/json');
                                res.setHeader('Access-Control-Allow-Origin', '*');
                                res.end(JSON.stringify({ 
                                    success: true, 
                                    message: 'C项目编译完成',
                                    configPath: configPath,
                                    compileOutput: compileResult
                                }));
                            } catch (error) {
                                console.error('编译C项目失败:', error);
                                res.setHeader('Content-Type', 'application/json');
                                res.setHeader('Access-Control-Allow-Origin', '*');
                                res.statusCode = 500;
                                res.end(JSON.stringify({ 
                                    success: false, 
                                    message: '编译C项目失败: ' + error.message 
                                }));
                            }
                        });
                    } catch (error) {
                        console.error('处理编译请求失败:', error);
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 500;
                        res.end(JSON.stringify({ 
                            success: false, 
                            message: '处理编译请求失败: ' + error.message 
                        }));
                    }
                } else {
                    next();
                }
            });

            // 添加运行项目的API
            server.middlewares.use('/api/run', async (req, res, next) => {
                if (req.method === 'POST') {
                    try {
                        let body = '';
                        req.on('data', chunk => {
                            body += chunk.toString();
                        });
                        
                        req.on('end', async () => {
                            try {
                                const { cProjectPath } = JSON.parse(body);
                                
                                // 确保C项目路径存在
                                if (!cProjectPath) {
                                    throw new Error('C项目路径不能为空');
                                }
                                
                                // 解析目标目录路径
                                let targetDir;
                                if (path.isAbsolute(cProjectPath)) {
                                    targetDir = cProjectPath;
                                } else {
                                    targetDir = path.resolve(process.cwd(), cProjectPath);
                                }
                                
                                console.log(`检查C项目路径: ${targetDir}`);
                                
                                // 检查目标目录是否存在
                                try {
                                    await fs.access(targetDir);
                                } catch (error) {
                                    throw new Error(`C项目目录不存在: ${targetDir}`);
                                }
                                
                                // 查找可执行文件
                                const possibleExecutables = ['zagent', 'main', 'a.out', 'program'];
                                let executablePath = null;
                                let executableName = null;
                                
                                for (const exeName of possibleExecutables) {
                                    const exePath = path.join(targetDir, exeName);
                                    try {
                                        await fs.access(exePath);
                                        // 检查文件是否可执行
                                        const stats = await fs.stat(exePath);
                                        if (stats.isFile()) {
                                            executablePath = exePath;
                                            executableName = exeName;
                                            break;
                                        }
                                    } catch (error) {
                                        // 文件不存在或不可访问，继续检查下一个
                                        continue;
                                    }
                                }
                                
                                if (!executablePath) {
                                    throw new Error('在C项目目录中未找到可执行文件。请先编译项目。');
                                }
                                
                                console.log(`找到可执行文件: ${executablePath}`);
                                
                                // 执行可执行文件
                                const { spawn } = await import('child_process');
                                const runProcess = spawn(executablePath, [], {
                                    cwd: targetDir,
                                    stdio: 'pipe'
                                });
                                
                                let output = '';
                                let errorOutput = '';
                                
                                runProcess.stdout.on('data', (data) => {
                                    output += data.toString();
                                });
                                
                                runProcess.stderr.on('data', (data) => {
                                    errorOutput += data.toString();
                                });
                                
                                // 设置超时时间（30秒）
                                const timeout = setTimeout(() => {
                                    runProcess.kill();
                                }, 30000);
                                
                                runProcess.on('close', (code) => {
                                    clearTimeout(timeout);
                                    console.log(`程序执行完成，退出码: ${code}`);
                                });
                                
                                runProcess.on('error', (error) => {
                                    clearTimeout(timeout);
                                    console.error(`程序执行失败: ${error.message}`);
                                });
                                
                                res.setHeader('Content-Type', 'application/json');
                                res.setHeader('Access-Control-Allow-Origin', '*');
                                res.end(JSON.stringify({ 
                                    success: true, 
                                    message: '程序已启动',
                                    executablePath: executablePath,
                                    executableName: executableName,
                                    pid: runProcess.pid
                                }));
                                
                            } catch (error) {
                                console.error('运行API错误:', error);
                                res.setHeader('Content-Type', 'application/json');
                                res.setHeader('Access-Control-Allow-Origin', '*');
                                res.statusCode = 400;
                                res.end(JSON.stringify({ 
                                    success: false, 
                                    message: error.message 
                                }));
                            }
                        });
                    } catch (error) {
                        console.error('运行API请求处理错误:', error);
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 500;
                        res.end(JSON.stringify({ 
                            success: false, 
                            message: '服务器内部错误' 
                        }));
                    }
                } else {
                    next();
                }
            });

            // 处理OPTIONS请求（CORS预检）
            server.middlewares.use('/api', (req, res, next) => {
                if (req.method === 'OPTIONS') {
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                    res.statusCode = 200;
                    res.end();
                } else {
                    next();
                }
            });
        }
    };
}
