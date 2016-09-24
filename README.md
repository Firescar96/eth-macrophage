# eth-macrophage
R&amp;D on Ethereum node (specifically go-ethereum client) peer selection and pseudonimity

There are two main versions of this project. Almost all of the underlying codebase of each is the same, but the [real branch](https://github.com/Firescar96/eth-macrophage/tree/real) has defaults set to operate on the Ethereum Morden Testnet while the [simulated branch](https://github.com/Firescar96/eth-macrophage/tree/simulated) has defaults set to create a private Ethereum network.

### Dependencies
docker OR (geth AND npm)

Geth normally does not log individual transactions so eth-macrophage requires a forked version. [Firescar96/go-ethereum](https://github.com/Firescar96/go-ethereum)

### Screenshots
http://imgur.com/a/EJklR

### Checkpoint Videos
[Checkpoint 1](https://www.dropbox.com/s/0h40iz5qvdbpd6e/eth-macrophage-checkpoint1.webm?dl=0)
[Checkpoint 2](https://www.dropbox.com/s/didfomy4322arfa/eth-macrophage-checkpoint2.webm?dl=0)
[Checkpoint 3](https://www.dropbox.com/s/eyalnqxfcbugny2/eth-macrophage-checkpoint3.webm?dl=0)

### COPYING
The LICENSE file provided in this directory applies to all eth-macrophage code in every branch.