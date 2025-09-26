import { promises as fs } from 'fs';
import path from 'path';

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
