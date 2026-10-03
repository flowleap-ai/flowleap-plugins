# FlowLeap Patent AI

The `flowleap` plugin is the FlowLeap Skill Pack: 32 skills for patent and IP
work with AI agents.

- **Data-access skills** (`flowleap-*`): EPO and USPTO patent search, full
  document data (claims, descriptions, families, legal status), academic and
  non-patent literature, patent-law references, office-action citations, and
  PATSTAT portfolio and graph analytics.
- **Recipes** (`recipe-*`): end-to-end workflows such as prior-art search,
  freedom-to-operate, patent landscape, claim analysis, and HTML dashboards
  with verified numbers.
- **Personas** (`persona-*`): patent attorney, IP analyst, researcher, and
  startup founder.

## Install

Add the marketplace and install the plugin in Claude Code:

```
/plugin marketplace add flowleap-ai/flowleap-plugins
/plugin install flowleap@flowleap-plugins
```

## The FlowLeap connector is included

The plugin includes the FlowLeap connector configuration (`.mcp.json`). It
points to the FlowLeap hosted MCP server at `https://api.flowleap.co/mcp`. You
sign in with OAuth when the connector asks. Thus the skills work in Claude
Code, and also in claude.ai and Cowork, where the skills call the connector
tools. In a terminal, the skills can also use the FlowLeap CLI
(`npm i -g flowleap`).

You add your Patent-Data Keys (EPO OPS, USPTO ODP) on the Patent-data keys page
of the FlowLeap dashboard, never in the chat.

## Links

- Connector guide: https://www.flowleap.co/en/mcp
- Privacy policy: https://www.flowleap.co/en/privacy
- Support: contact@flowleap.co
