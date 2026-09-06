return {
  "rose-pine/nvim",
  lazy = false,
  priority = 1000,
  name = "rose-pine",
  config = function()
    vim.g.transparency = vim.g.transparency ~= false
    require("rose-pine").setup({
      variant = "moon",
      disable_background = vim.g.transparency,
    })
  end,
}
