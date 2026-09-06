return {
  "sainnhe/everforest",
  lazy = false,
  priority = 1000,
  config = function()
    vim.g.transparency = vim.g.transparency ~= false
    vim.g.everforest_transparent_background = vim.g.transparency and 1 or 0
  end,
}
