# SendFile Workflow

> **Trigger:** "send to telegram", "deliver file", "share via telegram"
> **Input:** File path and optional caption
> **Output:** Confirmation of delivery with message ID

## Step 1: Verify Prerequisites

Check:
- Telegram bot running: `~/.claude/voice/manage.sh telegram-status`
- `TELEGRAM_BOT_TOKEN` set
- `TELEGRAM_ALLOWED_USERS` set (or user ID provided)

## Step 2: Execute CLI Tool

```bash
bun run $PAI_DIR/skills/TelegramDelivery/Tools/SendToTelegram.ts -f <file> [-c "caption"]
```

Options:
- `-f, --file` - File to send (required)
- `-c, --caption` - Message caption
- `-u, --user` - Target user ID
- `--silent` - Don't notify user

## Step 3: Confirm Delivery

Tool returns:
- Success: message ID and delivery confirmation
- Failure: error message and troubleshooting steps

## Completion

File delivered to Telegram. Message ID logged to `~/.claude/history/telegram-delivery.jsonl`.

## Skills Invoked

| Step | Skill |
|------|-------|
| Pre-requisite | Pdf (if generating PDF first) |
