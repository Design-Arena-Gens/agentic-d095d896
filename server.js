import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// MCP Server instance
const server = new Server(
  {
    name: "example-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "echo",
        description: "Echoes back the input message",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to echo back",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "add",
        description: "Adds two numbers together",
        inputSchema: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "First number",
            },
            b: {
              type: "number",
              description: "Second number",
            },
          },
          required: ["a", "b"],
        },
      },
      {
        name: "get_time",
        description: "Returns the current server time",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "echo":
      return {
        content: [
          {
            type: "text",
            text: `Echo: ${args.message}`,
          },
        ],
      };

    case "add":
      const sum = args.a + args.b;
      return {
        content: [
          {
            type: "text",
            text: `The sum of ${args.a} and ${args.b} is ${sum}`,
          },
        ],
      };

    case "get_time":
      return {
        content: [
          {
            type: "text",
            text: `Current server time: ${new Date().toISOString()}`,
          },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// HTTP endpoints for web access
app.get('/', (req, res) => {
  res.json({
    name: "MCP Server",
    version: "1.0.0",
    status: "running",
    capabilities: ["tools"],
    tools: [
      { name: "echo", description: "Echoes back the input message" },
      { name: "add", description: "Adds two numbers together" },
      { name: "get_time", description: "Returns the current server time" }
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/tools/list', async (req, res) => {
  try {
    const tools = await server.request(
      { method: "tools/list" },
      ListToolsRequestSchema
    );
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/tools/call', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;

    let result;
    switch (name) {
      case "echo":
        result = { content: [{ type: "text", text: `Echo: ${args.message}` }] };
        break;
      case "add":
        const sum = args.a + args.b;
        result = { content: [{ type: "text", text: `The sum of ${args.a} and ${args.b} is ${sum}` }] };
        break;
      case "get_time":
        result = { content: [{ type: "text", text: `Current server time: ${new Date().toISOString()}` }] };
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
});

// For stdio transport (optional)
async function runStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

// Use HTTP by default, stdio if explicitly requested
if (process.env.MCP_TRANSPORT === 'stdio') {
  runStdio().catch(console.error);
}
