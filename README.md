[![CircleCI](https://circleci.com/gh/giddy/giddy-device/tree/master.svg?style=svg)](https://circleci.com/gh/giddy/giddy-device/tree/master)
# Giddy Device

Arduino Module 

## Setup

The following lines explaines how to setup your environment depending on the IDE you want to use for development. My personal chice would be `vscode` as it has code completion available, versioning and other stuff. If it seems that it's harder to set it up just be patient for 5 mins and you'll definitely enjoy it afterwards.

### 1. Setup for `vscode`
- Install [Arduino IDE](https://www.arduino.cc/en/Main/Software)
- Install [vscode](https://code.visualstudio.com/)
- Locate our `vscode` custom [plugin](https://github.com/giddy/giddy-device/tree/master/res/vscode-arduino-plugin/vsciot-vscode.vscode-arduino-0.1.2)
- Copy the entire folder from our resources to the `vscode > extensions` folder on your machine
- Load the `<giddy-device>` repo in the `vscode` IDE
- Edit `.vscode > arduino.json` file (`sketchbookPath` is important here)
```
{
    "board"         : "arduino:avr:nano",             // set
    "configuration" : "cpu=atmega328",                // via
    "port"          : "COM4",                         // vscode
    "sketch"        : "src/Main.ino",                // interface
    "sketchbookPath": "<path>/<to>/<github-repo>/res" // IMPORTANT to set
}
```
- Shortcut for `Verify` command: `Ctrl + Alt + R`
- Shortcut for `Upload` command: `Ctrl + Alt + U`
- Have fun!

### 2. Setup for `Arduino IDE`
- Install [Arduino IDE](https://www.arduino.cc/en/Main/Software)
- Load the `<giddy-device>` repo in the `Arduino IDE`
- Go to `File > Preferences` (or `Ctrl + ,`)
- Update `Sketchbook location` to match `<path>/<to>/<github-repo>/res`
- Shortcut for `Verify` command: `Ctrl + R`
- Shortcut for `Upload` command: `Ctrl + U`
- Have fun!

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D
