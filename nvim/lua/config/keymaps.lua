-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
vim.keymap.set(
  "n",
  "<leader>sx",
  require("telescope.builtin").resume,
  { noremap = true, silent = true, desc = "Resume" }
)
vim.api.nvim_exec(
  [[ 
autocmd FileType pyrhon nnoremap <buffer> <F10>  :update<CR>:botright 8split term://python3 %<CR>]],
  true
)
