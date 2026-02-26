#!/bin/sh
# Jim CLI - Shell hook for terminal reminders
# Add this to your .zshrc or .bashrc:
#   source /path/to/.jim-hook.sh

if command -v jim > /dev/null 2>&1; then
  jim remind
fi
