export const arisanFactoryAbi = [
  {
    type: "function",
    name: "createArisan",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "organizer", type: "address" },
          { name: "iuranAmount", type: "uint256" },
          { name: "periodDuration", type: "uint256" },
          { name: "maxMembers", type: "uint256" },
          { name: "gracePeriodSeconds", type: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "arisanId", type: "uint256" }],
  },
] as const;

export const arisanPoolAbi = [
  {
    type: "function",
    name: "join",
    stateMutability: "nonpayable",
    inputs: [{ name: "arisanId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "depositIuran",
    stateMutability: "nonpayable",
    inputs: [
      { name: "arisanId", type: "uint256" },
      { name: "period", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "triggerPeriod",
    stateMutability: "nonpayable",
    inputs: [{ name: "arisanId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "claimable",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "ArisanCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "organizer", type: "address", indexed: false },
      { name: "memberCount", type: "uint256", indexed: false },
      { name: "iuranAmount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MemberJoined",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: false },
      { name: "slotIndex", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "WinnerSelected",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "period", type: "uint256", indexed: false },
      { name: "winner", type: "address", indexed: false },
      { name: "netAmount", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;
