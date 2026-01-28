---
name: N8n
description: Complete n8n workflow development toolkit. USE WHEN n8n workflows OR n8n expressions OR n8n Code nodes OR n8n validation OR n8n node configuration OR n8n MCP tools OR workflow patterns OR {{}} syntax OR $json/$input/$node.
---

# N8n Workflow Development

Comprehensive toolkit for building n8n workflows with Claude Code. Covers JavaScript/Python code nodes, expression syntax, node configuration, validation, and architectural patterns.

## Capabilities

| Area | Context File | Use When |
|------|--------------|----------|
| **JavaScript Code** | `Context/BUILTIN_FUNCTIONS.md`, `Context/COMMON_PATTERNS.md` | Writing JS in Code nodes, $input/$json/$node syntax |
| **Python Code** | `Context/STANDARD_LIBRARY.md`, `Context/COMMON_MISTAKES.md` | Writing Python in Code nodes, _input/_json syntax |
| **Expressions** | `Context/EXAMPLES.md`, `Context/DATA_ACCESS.md` | {{}} syntax, $json variables, expression errors |
| **Validation** | `Context/ERROR_CATALOG.md`, `Context/FALSE_POSITIVES.md` | Validation errors, warnings, fixing issues |
| **Node Config** | `Context/OPERATION_PATTERNS.md`, `Context/DEPENDENCIES.md` | Configuring nodes, required fields, property dependencies |
| **MCP Tools** | `Context/SEARCH_GUIDE.md`, `Context/VALIDATION_GUIDE.md` | Using n8n-mcp tools, searching nodes, templates |
| **Patterns** | `Context/WebhookProcessing.md`, `Context/AiAgentWorkflow.md` | Workflow architecture, HTTP APIs, databases, AI agents |

## Quick Reference

### JavaScript Code Node
```javascript
// Access input data
const items = $input.all();
const firstItem = $input.first();

// Access specific node output
const data = $node['NodeName'].json;

// Return processed items
return items.map(item => ({
  json: { processed: item.json.value }
}));
```

### Python Code Node
```python
# Access input data
items = _input.all()
first_item = _input.first()

# Return processed items
return [{"json": {"processed": item.json.value}} for item in items]
```

### Expression Syntax
```
{{ $json.fieldName }}
{{ $node['NodeName'].json.field }}
{{ $('NodeName').first().json.field }}
{{ DateTime.now().toISO() }}
```

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| N/A | Auto-triggered by n8n keywords | Context files loaded on demand |

## Examples

**Example 1: JavaScript Code Question**
```
User: "How do I access the previous node's data in n8n?"
→ References Context/BUILTIN_FUNCTIONS.md
→ Explains $input, $node, and $() syntax
```

**Example 2: Expression Error**
```
User: "My n8n expression {{ $json.items[0].name }} isn't working"
→ References Context/EXAMPLES.md and Context/ERROR_CATALOG.md
→ Diagnoses syntax issues
```

**Example 3: Workflow Architecture**
```
User: "How should I structure an n8n workflow for webhook processing?"
→ References Context/WebhookProcessing.md
→ Provides architectural patterns
```

## Related Skills

| Skill | Relationship |
|-------|--------------|
| **n8n-mcp MCP Server** | Provides actual n8n node/workflow tools |

## Attribution

Skills consolidated from [czlonkowski/n8n-skills](https://github.com/czlonkowski/n8n-skills).
