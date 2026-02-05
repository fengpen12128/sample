import OpenAI from "openai";
import process from 'process';

// 初始化 openai 客户端
const openai = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY, // 从环境变量读取
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

let reasoningContent = '';
let answerContent = '';
let isAnswering = false;
let enable_thinking = true;

let messages = [
    {
        role: "user",
        content: [
        { type: "image_url", image_url: { "url": "https://img.alicdn.com/imgextra/i1/O1CN01gDEY8M1W114Hi3XcN_!!6000000002727-0-tps-1024-406.jpg" } },
        { type: "text", text: "解答这道题" },
    ]
}]

async function main() {
    try {
        const stream = await openai.chat.completions.create({
            model: 'qwen3-vl-plus',
            messages: messages,
            stream: true,
          // 注意：在 Node.js SDK，enable_thinking 这样的非标准参数作为顶层属性传递的，无需放在 extra_body 中
          enable_thinking: enable_thinking,
          thinking_budget: 81920

        });

        if (enable_thinking){console.log('\n' + '='.repeat(20) + '思考过程' + '='.repeat(20) + '\n');}

        for await (const chunk of stream) {
            if (!chunk.choices?.length) {
                console.log('\nUsage:');
                console.log(chunk.usage);
                continue;
            }

            const delta = chunk.choices[0].delta;

            // 处理思考过程
            if (delta.reasoning_content) {
                process.stdout.write(delta.reasoning_content);
                reasoningContent += delta.reasoning_content;
            }
            // 处理正式回复
            else if (delta.content) {
                if (!isAnswering) {
                    console.log('\n' + '='.repeat(20) + '完整回复' + '='.repeat(20) + '\n');
                    isAnswering = true;
                }
                process.stdout.write(delta.content);
                answerContent += delta.content;
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();