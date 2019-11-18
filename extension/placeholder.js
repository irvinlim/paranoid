/*
Placeholder Replacement Logic
*/

//Attach closed shadow root to each paranoid tag
(async() => {
    let service = await ParanoidStorage.getService(origin);
    console.log(service);
    if (service) {
        //Get Paranoid Tags
        let paranoid_tags = document.getElementsByTagName("paranoid");
        console.log(paranoid_tags);
        for (let i = 0; i < paranoid_tags.length; i++){
            let current_tag = paranoid_tags[i];
            let uid = current_tag.getAttribute("uid");
            let attribute = current_tag.getAttribute("attribute");
            console.log(uid);
            console.log(service.uid);
            console.log(service.foreign_map);
            if(uid == service.uid || uid in service.foreign_map){
                let unmasked_data = "";
                if (uid == service.uid){
                    unmasked_data = service.map[attribute];
                } else {
                    unmasked_data = service.foreign_map[uid][attribute];
                }
                //Clear placeholder contents and append span element to house shadow root
                let replacement_span = document.createElement("span");
                current_tag.innerHTML = "";
                current_tag.appendChild(replacement_span);

                //Attach shadow root containing private data 
                let shadow = replacement_span.attachShadow({mode: 'closed'});
                let placeholder_replacement = document.createTextNode(unmasked_data);
                shadow.appendChild(placeholder_replacement);
            }
        }
    }
})();