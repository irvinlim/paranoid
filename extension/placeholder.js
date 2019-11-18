/*
Placeholder Replacement Logic
*/

//Get Paranoid Tags
let paranoid_tags = document.getElementsByTagName("paranoid");

//Attach closed shadow root to each tag
for (let i = 0; i < paranoid_tags.length; i++){
    let current_tag = paranoid_tags[i];
    let uid = current_tag.getAttribute("uid");
    let attribute = current_tag.getAttribute("attribute");

    //Clear placeholder contents and append span element to house shadow root
    let replacement_span = document.createElement("span");
    current_tag.innerHTML = "";
    current_tag.appendChild(replacement_span);

    //Attach shadow root containing private data 
    let shadow = replacement_span.attachShadow({mode: 'closed'});
    let placeholder_replacement = document.createTextNode("My Private Data")
    shadow.appendChild(placeholder_replacement);
}