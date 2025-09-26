import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 保存配置文件的API
app.post('/api/save-config', async (req, res) => {
    try {
        const configData = req.body;
        const configJson = JSON.stringify(configData, null, 2);
        
        // 保存到项目根目录的config.json
        const configPath = path.join(__dirname, 'config.json');
        await fs.writeFile(configPath, configJson, 'utf8');
        
        console.log('配置文件已保存到:', configPath);
        res.json({ success: true, message: '配置文件保存成功' });
    } catch (error) {
        console.error('保存配置文件失败:', error);
        res.status(500).json({ success: false, message: '保存配置文件失败: ' + error.message });
    }
});

// 获取配置文件的API
app.get('/api/get-config', async (req, res) => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        res.json(config);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ success: false, message: '配置文件不存在' });
        } else {
            console.error('读取配置文件失败:', error);
            res.status(500).json({ success: false, message: '读取配置文件失败: ' + error.message });
        }
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`配置服务器运行在 http://localhost:${PORT}`);
    console.log('API端点:');
    console.log('  POST /api/save-config - 保存配置文件');
    console.log('  GET  /api/get-config  - 获取配置文件');
});
