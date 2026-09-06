return {
  "shaunsingh/moonlight.nvim",
  lazy = false,
  priority = 1000,
  config = function()
    vim.g.transparency = vim.g.transparency ~= false
    vim.g.moonlight_disable_background = vim.g.transparency
  end,
}
