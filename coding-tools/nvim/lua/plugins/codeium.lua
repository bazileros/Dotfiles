return {
  "Exafunction/codeium.vim",
  lazy = false,
  priority = 1000,
  config = function()
    vim.keymap.set("i", "<c-a>", function()
      return vim.fn["codeium#Complete"]()
    end, { expr = true })
    vim.keymap.set("i", "<c-g>", function()
      return vim.fn["codeium#Accept"]()
    end, { expr = true })
    vim.keymap.set("i", "<M-a>", function()
      return vim.fn["codeium#CycleCompletions"](1)
    end, { expr = true })
    vim.keymap.set("i", "<M-g>", function()
      return vim.fn["codeium#CycleCompletions"](-1)
    end, { expr = true })
    vim.keymap.set("i", "<M-x>", function()
      return vim.fn["codeium#Clear"]()
    end, { expr = true })
  end,
}
