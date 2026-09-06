return {
  "marko-cerovac/material.nvim",
  lazy = false,
  priority = 1000,
  config = function()
    vim.g.transparency = vim.g.transparency ~= false
    require("material").setup({
      disable = { background = vim.g.transparency },
    })
  end,
}
