/**
 * 新数网络调试工具 (NetCommand)
 * Copyright (c) 2026 四川新数科技有限公司. All rights reserved.
 * 全局配置状态管理 - Pinia Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VendorType, ModuleType, DeviceTab } from '../types'
import { CommandGenerator } from '../generator/CommandGenerator'

// 创建默认设备配置
function createDefaultDevice(name: string = '设备1', vendor: VendorType = 'huawei'): DeviceTab {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name,
    vendor,
    basic: { enabled: true, hostname: '', banner: '', enablePassword: '', enableSecret: false, consoleTimeout: 10, sysContact: '', sysLocation: '' },
    vlan: { enabled: false, vlans: [{ id: '10', name: 'Office' }] },
    stp: { enabled: false, mode: 'mstp', mstRegionName: 'REGION1', mstRevision: 1, mstInstances: [{ instance: 0, vlans: '1 10 20', priority: 4096 }], bridgePriority: 32768, edgePorts: true, bpduProtect: true },
    dhcp: { enabled: false, enableServer: true, pools: [{ name: 'POOL1', network: '192.168.1.0', mask: '255.255.255.0', gateway: '192.168.1.1', dns1: '114.114.114.114', leaseTime: '3', excludedIps: '' }], relayInterfaces: [] },
    route: {
      enabled: false, staticRoutes: [],
      ospf: { enabled: false, processId: 1, routerId: '1.1.1.1', areas: { areas: [{ areaId: '0', networks: [{ network: '192.168.1.0', wildcard: '0.0.0.255' }] }] }, cost: undefined },
      rip: { enabled: false, version: '2', networkIds: [] }
    },
    interfaceConf: { enabled: false, interfaces: [
      { name: 'GigabitEthernet0/0/1', description: '', mode: 'access', accessVlan: '10', trunkVlans: 'all', speed: '', duplex: '', status: 'up', ipAddr: '', mask: '' }
    ], trunks: [], portGroupEnabled: false },
    remote: { enabled: false, sshEnabled: true, telnetEnabled: false, sshVersion: '2', sshPort: 22, telnetPort: 23, aaaNewModel: true, authUsers: [] },
    snmp: { enabled: false, enableAgent: true, version: 'v2c', communities: [{ name: 'public', permission: 'ro' }], sysContact: '', sysLocation: '', trapEnable: false, trapServers: [] },
    acl: { enabled: false, rules: [], applyToInterfaces: [], qosPolicyName: '', rateLimitKbps: 0 },
    ntp: { enabled: false, mode: 'client', servers: 'ntp.aliyun.com', timezone: 'Beijing', summerTime: '', authentication: false },
    log: { enabled: false, enableInfoCenter: true, defaultLevel: 'informational', timestampFormat: 'date', bufferSize: 512, enableSyslog: false, syslogServers: [], saveToFlash: false, maxLogFiles: 10, recordCommands: true },
    customCommands: [],
    moduleStates: {
      basic: true, vlan: false, stp: false, dhcp: false, route: false,
      interfaceConf: false, remote: false, snmp: false, acl: false, ntp: false, log: false, custom: false
    }
  }
}

export const useConfigStore = defineStore('config', () => {
  // 标签页列表（多设备）
  const tabs = ref<DeviceTab[]>([createDefaultDevice()])
  const activeTabId = ref(tabs.value[0].id)
  const activeModule = ref<ModuleType>('basic')

  // 当前活动标签页
  const activeTab = computed(() =>
    tabs.value.find(t => t.id === activeTabId.value) || tabs.value[0]
  )

  // 命令生成器实例（响应式更新）
  let generator: CommandGenerator | null = null

  function getGenerator(): CommandGenerator {
    if (!generator || (generator as any)._vendor !== activeTab.value.vendor) {
      generator = new CommandGenerator(activeTab.value.vendor);
      (generator as any)._vendor = activeTab.value.vendor
    }
    return generator
  }

  // 生成当前设备的完整命令
  const generatedCommands = computed(() => {
    const tab = activeTab.value
    if (!tab) return ''
    const gen = getGenerator()
    return gen.generateAll(
      tab.basic, tab.vlan, tab.stp, tab.dhcp, tab.route,
      tab.interfaceConf, tab.remote, tab.snmp, tab.acl, tab.ntp,
      tab.log, tab.customCommands
    )
  })

  // 生成单个模块命令
  function generateModuleCommands(moduleType: ModuleType): string {
    const tab = activeTab.value
    if (!tab) return ''
    const gen = getGenerator()
    switch (moduleType) {
      case 'basic': return gen.generateBasic(tab.basic).join('\n')
      case 'vlan': return gen.generateVlan(tab.vlan).join('\n')
      case 'stp': return gen.generateStp(tab.stp).join('\n')
      case 'dhcp': return gen.generateDhcp(tab.dhcp).join('\n')
      case 'route': return gen.generateRoute(tab.route).join('\n')
      case 'interfaceConf': return gen.generateInterface(tab.interfaceConf).join('\n')
      case 'remote': return gen.generateRemote(tab.remote).join('\n')
      case 'snmp': return gen.generateSnmp(tab.snmp).join('\n')
      case 'acl': return gen.generateAcl(tab.acl).join('\n')
      case 'ntp': return gen.generateNtp(tab.ntp).join('\n')
      case 'log': return gen.generateLog(tab.log).join('\n')
      case 'custom': return gen.generateCustom(tab.customCommands).join('\n')
    }
  }

  // ===== 标签页操作 =====
  function addTab() {
    const newTab = createDefaultDevice(`设备${tabs.value.length + 1}`, activeTab.value?.vendor || 'huawei')
    tabs.value.push(newTab)
    activeTabId.value = newTab.id
  }

  function removeTab(id: string) {
    if (tabs.value.length <= 1) return
    const idx = tabs.value.findIndex(t => t.id === id)
    tabs.value.splice(idx, 1)
    if (activeTabId.value === id) {
      activeTabId.value = tabs.value[Math.max(0, idx - 1)].id
    }
  }

  function setActiveTab(id: string) {
    activeTabId.value = id
  }

  // 更新当前标签页的厂商
  function setVendor(vendor: VendorType) {
    if (activeTab.value) {
      activeTab.value.vendor = vendor
      generator = null
    }
  }

  // 更新当前标签页名称
  function setTabName(name: string) {
    if (activeTab.value) {
      activeTab.value.name = name
    }
  }

  // 切换模块启用状态
  function toggleModule(module: ModuleType, enabled?: boolean) {
    if (activeTab.value) {
      if (enabled !== undefined) {
        activeTab.value.moduleStates[module] = enabled
        // 同时设置对应配置的 enabled
        switch (module) {
          case 'basic': activeTab.value.basic.enabled = enabled; break
          case 'vlan': activeTab.value.vlan.enabled = enabled; break
          case 'stp': activeTab.value.stp.enabled = enabled; break
          case 'dhcp': activeTab.value.dhcp.enabled = enabled; break
          case 'route': activeTab.value.route.enabled = enabled; break
          case 'interfaceConf': activeTab.value.interfaceConf.enabled = enabled; break
          case 'remote': activeTab.value.remote.enabled = enabled; break
          case 'snmp': activeTab.value.snmp.enabled = enabled; break
          case 'acl': activeTab.value.acl.enabled = enabled; break
          case 'ntp': activeTab.value.ntp.enabled = enabled; break
          case 'log': activeTab.value.log.enabled = enabled; break
        }
      } else {
        activeTab.value.moduleStates[module] = !activeTab.value.moduleStates[module]
      }
    }
  }

  return {
    tabs, activeTabId, activeTab, activeModule,
    generatedCommands,
    addTab, removeTab, setActiveTab, setVendor, setTabName,
    toggleModule, generateModuleCommands, getGenerator
  }
})
