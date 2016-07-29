# eth-macrophage
R&amp;D on Ethereum node (specifically go-ethereum client) peer selection and pseudonimity

### Screenshots
http://imgur.com/a/EJklR

### Checkpoint Videos
[Checkpoint 1](https://www.dropbox.com/s/0h40iz5qvdbpd6e/eth-macrophage-checkpoint1.webm?dl=0)
[Checkpoint 2](https://www.dropbox.com/s/didfomy4322arfa/eth-macrophage-checkpoint2.webm?dl=0)
[Checkpoint 3](https://www.dropbox.com/s/eyalnqxfcbugny2/eth-macrophage-checkpoint3.webm?dl=0)

## Running the project

### Running it locally

#### Dependencies
go-ethereum, npm, node>=6.x

Geth normally does not log individual transactions so eth-macrophage requires a forked version. The `develop` branch is required, but look out for the occasional rebase and force push to keep up with upstream. [Firescar96/go-ethereum](https://github.com/Firescar96/go-ethereum)

#### Execution
Enter the `app/` directory and run `node app`.

#### Development
You'll need [webpack](https://www.npmjs.com/package/webpack) to build/compile your changes to the source. The config is located in `app/webpack.config.js`.

### Docker
Alternatively it may be easier to use my docker container. New docker releases will lag slightly behind my rate of development.

#### Execution
`docker run --rm -P --net host -ti firescar96/eth-macrophage:<tag> bash`
For <tag> choose either `client` or `server`. The versions are very similar, but optimized for running on a weak computer vs a more powerful server respectively.

For persistent storage of the blockchain I perfer to mount my local ethereum directory. Change the mount point to a different directory if you have anything you care about (like all your ether) in `$HOME/.ethereum`.

`docker run --rm -P --net host -v $HOME/.ethereum/:/root/eth-macrophage/.ethereum -ti firescar96/eth-macrophage bash`

and run `node app` from inside.

#### Development
You'll need [webpack](https://www.npmjs.com/package/webpack) to build/compile your changes to the source. The config is located in `app/webpack.config.js`. It may be helpful to mount the docker container to your development directory for persistent changes.

`docker run --rm -P --net host -v $HOME/.ethereum/:/root/eth-macrophage/.ethereum -v <path-to-eth-macrophage>:/root/eth-macrophage/eth-macrophage/ -ti firescar96/eth-macrophage bash`
