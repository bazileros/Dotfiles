-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

-- Toggle background transparency (lua/config/transparency.lua)
vim.keymap.set("n", "<leader>ut", function() require("config.transparency").toggle() end, { desc = "Toggle transparency" })
