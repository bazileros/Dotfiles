-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here
vim.opt.winbar = "%=%m %f"
vim.opt.scrolloff = 8           -- keep 8 lines visible above/below the cursor
vim.opt.signcolumn = "yes"      -- always reserve the sign gutter, no layout jump
vim.opt.undofile = true         -- persistent undo across sessions
vim.opt.splitbelow = true       -- :split opens below
vim.opt.splitright = true       -- :vsplit opens right
vim.opt.inccommand = "split"    -- live preview of :%s/ substitutions
vim.opt.smartcase = true        -- case-insensitive search unless an uppercase is present
if vim.fn.has("clipboard") == 1 and vim.fn.has("wsl") == 0 then
  vim.opt.clipboard = "unnamedplus" -- system clipboard (skipped under WSL)
end
