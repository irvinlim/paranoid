(async() => {
    let services = await ParanoidStorage._getAll();
    console.log(services);
    let accordian = document.getElementById('accordionExample'); 
    accordian.innerHTML = ""; //clear accordian
    for (let service in services) {
        console.log(services[service]);
        let origin = services[service].origin.replaceAll(".", "").replaceAll(":", "-").replaceAll("/", "");
        accordian.innerHTML += 
        '<div class="card">'+
            `<div class="card-header" id="heading${origin}">`+
                '<h2 class="mb-0">'+
                    `<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse${origin}" aria-expanded="true" aria-controls="collapse${origin}">`+
                        `${services[service].origin}`+
                    '</button>'+
                '</h2>'+
            '</div>'+
            `<div id="collapse${origin}" class="collapse" aria-labelledby="heading${origin}" data-parent="#accordionExample">`+
                '<div class="card-body">'+
                    '<table class="table">'+
                        '<thead class="thead-light">'+
                            '<tr>'+
                                '<th scope="col">Placeholder Key</th>'+
                                '<th scope="col">Value</th>'+
                            '</tr>'+
                        '</thead>'+
                        '<tbody>'+
                            getKeyValueHTML(services[service])+
                        '</tbody>'+
                    '</table>'+
                '</div>'+
            '</div>'+
        '</div>';
    }

    $('.editable').editable({
        type: 'text',
        placement: 'left',
    });

    $('.editable').on('save', function(e, params) {
        let newValue = params.newValue;
        let origin = e.target.getAttribute("origin");
        let key = e.target.getAttribute("key");
        (async() => {
            await ParanoidStorage.setServiceMap(origin,key,newValue);
        })();
    });
    
})();

function getKeyValueHTML(service){
    html = "";
    console.log(service.map);
    for (let key in service.map) {
        console.log(key);
        html +=
            '<tr>'+
                `<td>${key}</td>`+
                `<td class="editable" origin="${service.origin}" key="${key}">${service.map[key]}</td>`+
            '</tr>';
    }
    return html;
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};