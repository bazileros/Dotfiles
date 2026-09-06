-- bootstrap lazy.nvim, LazyVim and your plugins
require("config.lazy")

-- Active colorscheme (kept themes are declared in lua/plugins/)
-- vim.cmd.colorscheme("NeoSolarized")

-- Alternatives (switch here by uncommenting; the theme specs are already installed):
vim.cmd.colorscheme("kanagawa")
-- vim.cmd.colorscheme("tokyonight")
-- vim.cmd.colorscheme("catppuccin-mocha")
-- vim.cmd.colorscheme("rose-pine")
-- vim.cmd.colorscheme("gruvbox-material")
-- vim.cmd.colorscheme("everforest")
-- vim.cmd.colorscheme("nordic")
-- vim.cmd.colorscheme("nightfox") -- defaults to the "nightfox" flavor
-- vim.cmd.colorscheme("material")
-- vim.cmd.colorscheme("oxocarbon")
-- vim.cmd.colorscheme("moonlight")
-- vim.cmd.colorscheme("solarized-osaka")
-- vim.cmd.colorscheme("vscode")
-- vim.cmd.colorscheme("onedark")

-- Apply the default transparency state on startup (toggle with <leader>ut)
require("config.transparency").apply()
