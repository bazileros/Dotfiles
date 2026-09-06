return {
  "Mofiqul/vscode.nvim",
  lazy = false,
  priority = 1000,
  config = function()
    vim.g.transparency = vim.g.transparency ~= false
    require("vscode").setup({
      transparent = vim.g.transparency,
    })
  end,
}
