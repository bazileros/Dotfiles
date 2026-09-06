return {
  "craftzdog/solarized-osaka.nvim",
  lazy = false,
  priority = 1000,
  config = function()
    vim.g.transparency = vim.g.transparency ~= false
    require("solarized-osaka").setup({
      transparent = vim.g.transparency,
    })
  end,
}
