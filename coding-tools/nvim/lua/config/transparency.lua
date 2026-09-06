-- Shared transparency toggle: exposes apply()/toggle() and publishes vim.g.transparency
-- so the theme specs in lua/plugins/*.lua can read the same flag uniformly.
vim.g.transparency = vim.g.transparency ~= false -- default: transparent ON

local M = {}

M.enabled = vim.g.transparency ~= false

-- Core background groups forced transparent when enabled. These work even for
-- themes that have no `transparent` option of their own.
local TRANSPARENT_GROUPS = {
  "NormalFloat",
  "NormalNC",
  "SignColumn",
  "LineNr",
  "CursorLine",
  "MsgArea",
}

function M.apply()
  -- Re-apply the active colorscheme so highlight groups reset to theme defaults
  -- (this is also what restores them when transparency is disabled).
  local theme = vim.g.colors_name or "catppuccin-mocha"
  vim.cmd.colorscheme(theme)

  if not M.enabled then
    return
  end

  -- Capture the current Normal fg so it isn't lost when we override the bg.
  local normal_fg = vim.api.nvim_get_hl(0, { name = "Normal" }).fg
  vim.api.nvim_set_hl(0, "Normal", { bg = "none", fg = normal_fg })

  for _, group in ipairs(TRANSPARENT_GROUPS) do
    local hl = vim.api.nvim_get_hl(0, { name = group })
    hl.bg = "none"
    vim.api.nvim_set_hl(0, group, hl)
  end
end

function M.toggle()
  M.enabled = not M.enabled
  vim.g.transparency = M.enabled
  M.apply()
end

return M
