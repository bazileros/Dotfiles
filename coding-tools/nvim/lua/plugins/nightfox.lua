return {
  "EdenEast/nightfox.nvim",
  lazy = false,
  priority = 1000,
  config = function()
    vim.g.transparency = vim.g.transparency ~= false
    require("nightfox").setup({
      options = { transparent = vim.g.transparency },
    })
  end,
}
