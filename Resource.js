class Resource {

    constructor() {
        
    }

    loadFile(name) {
        
    }

    downloadAllFiles(path, files, done) {
        let buffers = {};
        let leftToDownload = files.length;

        function getBinary(url, success) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4) {
                    if (xhr.response === null) {
                        throw "Fatal error downloading '" + url + "'";
                    } else {
                        console.log("Successfully downloaded '" + url + "'");
                        success(xhr.response);
                    }
                }
            };
            xhr.send();
        }

        function handleFile(num) {
            getBinary(path + files[num], (buffer) => {
                buffers[files[num]] = new ByteStream(buffer);
                leftToDownload--;
                if (leftToDownload === 0) {
                    done(buffers);
                }
            });
        }

        for (var i = 0; i < files.length; i++) {
            handleFile(i);
        }
    }
}