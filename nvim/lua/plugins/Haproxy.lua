return {
  "Joorem/vim-haproxy",
  lazy = true,
  priority = 1000,
  config = function()
    vim.cmd("syntax enable")
    vim.cmd("filetype plugin indent on")
    vim.g["vim_haproxy_enable_error_highlight"] = 1 -- Highlight errors
  end,
}
