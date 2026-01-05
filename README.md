# Endless Dimensions

A Minecraft mod using Moud (TypeScript) that replicates the 20w14infinite snapshot mechanics with unlimited block possibilities.

## Features

- **Unlimited Block Selection**: Unlike other mods, includes ALL blocks including diamond blocks, emerald blocks, etc.
- **Chaotic Generation**: True random dimension generation based on book text
- **Easter Eggs**: Special dimensions for specific text inputs
- **Portal Mechanics**: Throw a written book into a nether portal to create a new dimension

## Installation

1. Install Moud framework
2. Run `npm install` in this directory
3. Run `npm run build` to compile TypeScript
4. Copy the `dist` folder to your Minecraft mods folder

## Usage

1. Write any text in a book and quill
2. Throw the book into a nether portal
3. Get transported to a randomly generated dimension based on your text!

## Development

- `npm run dev` - Watch mode for development
- `npm run build` - Build for production
- `npm run clean` - Clean build output

## Key Differences from ProjectInfinity

- **No Block Filtering**: All blocks (including diamond blocks, emerald blocks, etc.) have equal chance
- **Inclusive Registry**: Uses entire block registry instead of filtered lists
- **True Chaos**: Maintains the original snapshot's unpredictable nature
