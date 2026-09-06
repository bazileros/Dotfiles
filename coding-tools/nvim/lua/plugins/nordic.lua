return {
  "AlexvZyl/nordic.nvim",
  lazy = false,
  priority = 1000,
  config = function()
    vim.g.transparency = vim.g.transparency ~= false
    require("nordic").setup({
      transparent = { bg = vim.g.transparency, float = vim.g.transparency },
    })
  end,
}
