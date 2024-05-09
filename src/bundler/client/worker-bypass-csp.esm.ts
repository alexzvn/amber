const expects = [
  'content-security-policy',
  'content-security-policy-report-only',
  'x-webkit-csp',
  'x-content-security-policy'
]

const net = chrome.declarativeNetRequest
const { RuleActionType: Action, HeaderOperation: Header, ResourceType: Type } = net

const rules: chrome.declarativeNetRequest.Rule[] = [{
  id: 1,
  action: {
    type: Action.MODIFY_HEADERS,
    responseHeaders: expects.map(header => ({
      operation: Header.REMOVE,
      header: header
    }))
  },
  condition: {
    urlFilter: '|http*',
    resourceTypes: [ Type.MAIN_FRAME, Type.SUB_FRAME ]
  }
}]

net.updateDynamicRules({
  removeRuleIds: rules.map(r => r.id),
  addRules: rules
})
