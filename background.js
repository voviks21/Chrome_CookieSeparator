
chrome.browserAction.onClicked.addListener(function(tab) {
    switchTab(tab.id);
});

chrome.tabs.onActivated.addListener(function(info) {
    presentTab(info.tabId);
});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo['status'] == 'loading') {
        presentTab(tabId);
    }
});
chrome.windows.onFocusChanged.addListener(function(windowId) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        var tab = tabs[0];
        presentTab(tab.id);
    });
});


function switchTab(id) {
    if (cookieSeparator.hasSeparetedTab(id)) {
        cookieSeparator.unseparate(id);
    } else {
        cookieSeparator.separate(id);
    }
    setTimeout(function() {
        presentTab(id);
    }, 1);
}

function presentTab(id) {
    chrome.tabs.get(id, function(tab) {
        console.log(tab.url);
        if (/^(chrome-devtools)/.test(tab.url)) {
            console.log('skip chrome page');
            return;
        }
        if (cookieSeparator.hasSeparetedTab(id)) {
            chrome.browserAction.setIcon({
                path: 'icon32b.png'
            }, function() {

            });
        } else {
            chrome.browserAction.setIcon({
                path: 'icon32a.png'
            }, function() {

            });
        }
    });

}