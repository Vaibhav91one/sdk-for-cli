# Appwrite Command Line SDK

![License](https://img.shields.io/github/license/appwrite/sdk-for-cli.svg?style=flat-square)
![Version](https://img.shields.io/badge/api%20version-0.11.0-blue.svg?style=flat-square)
[![Build Status](https://img.shields.io/travis/com/appwrite/sdk-generator?style=flat-square)](https://travis-ci.com/appwrite/sdk-generator)
[![Twitter Account](https://img.shields.io/twitter/follow/appwrite?color=00acee&label=twitter&style=flat-square)](https://twitter.com/appwrite)
[![Discord](https://img.shields.io/discord/564160730845151244?label=discord&style=flat-square)](https://appwrite.io/discord)

**This SDK is compatible with Appwrite server version 0.11.x. For older versions, please check [previous releases](https://github.com/appwrite/sdk-for-cli/releases).**

Appwrite is an open-source backend as a service server that abstract and simplify complex and repetitive development tasks behind a very simple to use REST API. Appwrite aims to help you develop your apps faster and in a more secure way. Use the Command Line SDK to integrate your app with the Appwrite server to easily start interacting with all of Appwrite backend APIs and tools. For full API documentation and tutorials go to [https://appwrite.io/docs](https://appwrite.io/docs)

![Appwrite](https://appwrite.io/images/github.png)

## Installation

This tutorial assumes that you have docker setup and running on your machine. 

You can install the CLI by getting our installation script.

### Linux / MacOS 
```bash
$ wget -q https://appwrite.io/cli/install.sh  -O - | /bin/bash  
```

### Windows
```powershell
$ iwr -useb https://appwrite.io/cli/install.ps1 | iex
```

## Initialisation 
The CLI needs to be initialised with your project settings. This can be done using 
```sh
$ appwrite init 
```

The CLI requires an endpoint, project ID, API key and a locale to be able to communicate with the Appwrite backend server. There are two ways to achieve this 

### 1. Pass in the project settings along with `appwrite init`

```sh
$ appwrite init --endpoint="YOUR ENDPOINT" --project="YOUR PROJECT ID" --key="YOUR API KEY" --locale="YOUR LOCALE"
```

If any of the required values are missing, a prompt will show up, asking for those missing values.

### 2. Using the prompt

Invoking `appwrite init` without any params triggers an interactive prompt where you can manually enter the details. These values are saved locally so that you dont have to re-enter them everytime. 

### Note
By default, requests to domains with self signed SSL certificates (or no certificates) are disabled. If you trust the domain, you can bypass the certificate validation by using
```sh
$ appwrite client setSelfSigned --value=true 
```

## Usage 

The Appwrite CLI follows the following general syntax.
```sh
$ appwrite [SERVICE] [COMMAND] --[OPTIONS]
```

A few sample commands to get you started 

```sh
$ appwrite users create --email="hello@appwrite.io" --password="very_strong_password"
$ appwrite users list 
```

To create a Document you can use the following command 
```sh
$ appwrite database createDocument --collectionId="YOUR COLLECTION ID" --data='A VALID JSON STRING' --read=role:member --read="*" --write=role:guest
```

### Some Gotchas
- `data` expects the JSON string to be escaped.
- If using the wildcard (`*`) read or write permissions , make sure that it is properly escaped using a `\` or by enclosing it in `"*"` since bash interprets them differently.
- Some arguments like `read` and `write` permissions are expected to be arrays. In the Appwrite CLI, arrays are passed by simply repeating the argument as seen in the `createDocument` example above.

To get information about the different services available, you can use 
```sh
$ appwrite help
```

To get information about a particular service and the commands available in a service you can use 
```sh
$ appwrite users help
$ appwrite accounts help
```

To get information about a particular command and the parameters it accepts, you can use

```sh
$ appwrite users list --help
$ appwrite account get --help 
```

## Contribution

This library is auto-generated by Appwrite custom [SDK Generator](https://github.com/appwrite/sdk-generator). To learn more about how you can help us improve this SDK, please check the [contribution guide](https://github.com/appwrite/sdk-generator/blob/master/CONTRIBUTING.md) before sending a pull-request.

To build and test the CLI for development, follow these steps 

1. Clone the SDK Generator
```sh
$ git clone https://github.com/appwrite/sdk-generator
```

2. Ensure that docker is running locally and then run 
```sh 
$ cd sdk-generator

# Install the composer dependencies
$ docker run --rm --interactive --tty --volume "$(pwd)":/app composer install --ignore-platform-reqs --optimize-autoloader --no-plugins --no-scripts --prefer-dist

# Generate the SDKs
$ docker run --rm -v $(pwd):/app -w /app php:7.4-cli php example.php
```

3. Head over to the generated SDK and build the CLI docker image 
```sh
$ cd examples/CLI
$ docker build -t appwrite/cli .
```

4. Install the CLI

MacOS and Linux

Open `install.sh` and change [this line](https://github.com/appwrite/sdk-for-cli/blob/master/install.sh#L33) to `APPWRITE_CLI_IMAGE_VERSION=latest` and 
comment [these lines](https://github.com/appwrite/sdk-for-cli/blob/master/install.sh#L119-L123). 

You can now install the CLI using 
```sh
$ chmod +x install.sh
$ ./install.sh
```

Windows

Open `install.ps1` and change [this line](https://github.com/appwrite/sdk-for-cli/blob/master/install.ps1#L28) to `APPWRITE_CLI_IMAGE_VERSION=latest` and 
comment [these lines](https://github.com/appwrite/sdk-for-cli/blob/master/install.ps1#L85-L89)

You can now install the CLI using 
```sh
$ ./install.ps1
```

## License

Please see the [BSD-3-Clause license](https://raw.githubusercontent.com/appwrite/appwrite/master/LICENSE) file for more information.