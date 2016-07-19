FROM debian:testing

MAINTAINER Nchinda Nchinda <nchinda2@gmail.com>

ENV HOME /root/eth-macrophage
RUN mkdir /root/eth-macrophage

RUN apt-get update -q -y \
    && apt-get upgrade -q -y \
    && apt-get dist-upgrade -q -y
RUN apt-get install -y build-essential libgmp3-dev golang
RUN apt-get install -y git curl

RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install nodejs

WORKDIR $HOME
RUN curl -O https://storage.googleapis.com/golang/go1.4.2.linux-amd64.tar.gz
RUN tar -C /usr/local -xzf go1.4.2.linux-amd64.tar.gz
RUN mkdir -p ~/go; echo "export GOPATH=$HOME/go" >> ~/.bashrc
RUN export PATH=$HOME/go/bin:/usr/local/go/bin:$PATH #This line may be unecessary
RUN export PATH=$HOME/go/bin:/usr/local/go/bin:$PATH

RUN git clone https://github.com/Firescar96/go-ethereum
WORKDIR go-ethereum
RUN git checkout develop
RUN make geth
RUN ln -s $HOME/go-ethereum/build/bin/geth /usr/local/bin/geth

RUN curl https://install.meteor.com/ | sh

WORKDIR $HOME
RUN git clone https://github.com/Firescar96/eth-macrophage
WORKDIR eth-macrophage/app

RUN git checkout real
RUN meteor npm install --save react react-mounter react-dom tail-stream

#meteor port
EXPOSE 4000
#geth broadcast port
EXPOSE 23000-23005
#geth rpc port
EXPOSE 24000-24005
#txdata logging port
EXPOSE 25000-25005


ENTRYPOINT ["/bin/bash", "-c"]
CMD ["meteor", "-p", "4000"]
