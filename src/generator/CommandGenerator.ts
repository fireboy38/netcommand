import type {
  VendorType,
  BasicConfig, VlanConfig, StpConfig, DhcpConfig, RouteConfig,
  InterfaceConfig as InterfaceConfType, RemoteConfig, SnmpConfig, AclConfig,
  NtpConfig, CustomCommand
} from '../types'

/**
 * 新数网络调试工具 (NetCommand)
 * Copyright (c) 2026 四川新数科技有限公司. All rights reserved.
 * 命令生成引擎 - 根据厂商和配置生成对应的CLI命令
 */
 * 命令生成引擎 - 支持华为/锐捷/华三三种厂商语法
 */
export class CommandGenerator {
  private vendor: VendorType

  constructor(vendor: VendorType) {
    this.vendor = vendor
  }

  // ========== 厂商特定前缀 ==========
  private sysView(): string {
    switch (this.vendor) {
      case 'huawei': return 'system-view\n'
      case 'ruijie': return 'configure terminal\n'
      case 'h3c': return 'system-view\n'
    }
  }

  private intfPrefix(iface: string): string {
    switch (this.vendor) {
      case 'huawei': return `interface ${iface}`
      case 'ruijie': return `interface ${iface}`
      case 'h3c': return `interface ${iface}`
    }
  }

  private vlanCreateCmd(vid: string, name: string): string[] {
    const cmds: string[] = []
    switch (this.vendor) {
      case 'huawei':
        cmds.push(`vlan ${vid}`, ` name ${name}`)
        break
      case 'ruijie':
        cmds.push(`vlan ${vid}`, ` name ${name}`)
        break
      case 'h3c':
        cmds.push(`vlan ${vid}`, ` name ${name}`)
        break
    }
    return cmds
  }

  // ========== 基础配置 ==========
  generateBasic(cfg: BasicConfig): string[] {
    if (!cfg.enabled || !cfg.hostname) return []
    const cmds: string[] = []
    cmds.push(this.sysView())

    switch (this.vendor) {
      case 'huawei':
        if (cfg.hostname) cmds.push(`sysname ${cfg.hostname}`)
        if (cfg.banner) cmds.push(`header login information "${cfg.banner}"`)
        if (cfg.enableSecret && cfg.enablePassword) {
          cmds.push(`super password cipher ${cfg.enablePassword}`)
        }
        if (cfg.consoleTimeout > 0) {
          cmds.push('user-interface console 0',
            ` idle-timeout ${cfg.consoleTimeout} 0`)
        }
        if (cfg.sysContact) cmds.push(`syscontact ${cfg.sysContact}`)
        if (cfg.sysLocation) cmds.push(`syslocation ${cfg.sysLocation}`)
        break
      case 'ruijie':
        if (cfg.hostname) cmds.push(`hostname ${cfg.hostname}`)
        if (cfg.banner) cmds.push(`banner motd #${cfg.banner}#`)
        if (cfg.enableSecret && cfg.enablePassword) {
          cmds.push(`enable secret ${cfg.enablePassword}`)
        }
        if (cfg.consoleTimeout > 0) {
          cmds.push('line console 0',
            ` exec-timeout ${cfg.consoleTimeout}`)
        }
        break
      case 'h3c':
        if (cfg.hostname) cmds.push(`sysname ${cfg.hostname}`)
        if (cfg.banner) cmds.push(`header login ^${cfg.banner}^`)
        if (cfg.consoleTimeout > 0) {
          cmds.push('user-interface console 0',
            ` idle-timeout ${cfg.consoleTimeout}`)
        }
        break
    }
    return cmds
  }

  // ========== VLAN ==========
  generateVlan(cfg: VlanConfig): string[] {
    if (!cfg.enabled || !cfg.vlans.length) return []
    const cmds: string[] = []
    cmds.push(this.sysView())
    cfg.vlans.forEach(v => {
      cmds.push(...this.vlanCreateCmd(v.id, v.name))
      if (v.description) {
        cmds.push(` description ${v.description}`)
      }
    })
    return cmds
  }

  // ========== STP/MSTP ==========
  generateStp(cfg: StpConfig): string[] {
    if (!cfg.enabled) return []
    const cmds: string[] = []
    cmds.push(this.sysView())

    switch (this.vendor) {
      case 'huawei':
        if (cfg.mode === 'mstp') {
          cmds.push('stp mode mstp', 'stp region-configuration',
            ` region-name ${cfg.mstRegionName}`,
            ` revision-level ${cfg.mstRevision}`)
          cfg.mstInstances.forEach(inst => {
            cmds.push(` instance ${inst.instance} vlan ${inst.vlans}`)
          })
          cmds.push('active region-configuration')
          cfg.mstInstances.forEach(inst => {
            if (inst.priority !== 4096) {
              cmds.push(`stp instance ${inst.instance} priority ${inst.priority}`)
            }
          })
        } else {
          const modeMap: Record<string, string> = { stp: 'stp', rstp: 'rstp' }
          cmds.push(`stp mode ${modeMap[cfg.mode] || 'rstp'}`)
          if (cfg.bridgePriority !== 32768) {
            cmds.push(`stp priority ${cfg.bridgePriority}`)
          }
        }
        if (cfg.edgePorts) cmds.push('stp edge-port enable')
        if (cfg.bpduProtect) cmds.push('stp bpdu-protection')
        break

      case 'ruijie':
        if (cfg.mode === 'mstp') {
          cmds.push('spanning-tree mode mst', 'spanning-tree mst configuration',
            ` name ${cfg.mstRegionName}`,
            ` revision ${cfg.mstRevision}`)
          cfg.mstInstances.forEach(inst => {
            cmds.push(` instance ${inst.instance} vlan ${inst.vlans}`)
          })
          cmds.push('exit')
          cfg.mstInstances.forEach(inst => {
            if (inst.priority !== 32768) {
              cmds.push(`spanning-tree mst ${inst.instance} priority ${inst.priority}`)
            }
          })
        } else {
          const modeMap: Record<string, string> = { stp: 'pvst', rstp: 'rapid-pvst' }
          cmds.push(`spanning-tree mode ${modeMap[cfg.mode] || 'rapid-pvst'}`)
          if (cfg.bridgePriority !== 32768) {
            cmds.push(`spanning-tree vlan 1 priority ${cfg.bridgePriority}`)
          }
        }
        if (cfg.edgePorts) cmds.push('spanning-tree portfast')
        if (cfg.bpduProtect) cmds.push('spanning-tree bpduguard enable')
        break

      case 'h3c':
        if (cfg.mode === 'mstp') {
          cmds.push('stp region-configuration',
            ` region-name ${cfg.mstRegionName}`,
            ` revision-level ${cfg.mstRevision}`)
          cfg.mstInstances.forEach(inst => {
            cmds.push(` instance ${inst.instance} vlan ${inst.vlans}`)
          })
          cmds.push('active region-configuration')
          cfg.mstInstances.forEach(inst => {
            if (inst.priority !== 0) {
              cmds.push(`stp instance ${inst.instance} priority ${inst.priority}`)
            }
          })
        } else {
          cmds.push('stp mode rstp')
          if (cfg.bridgePriority !== 32768) {
            cmds.push(`stp priority ${cfg.bridgePriority}`)
          }
        }
        if (cfg.edgePorts) cmds.push('stp edged-port enable')
        if (cfg.bpduProtect) cmds.push('stp bpdu-protection')
        break
    }
    return cmds
  }

  // ========== DHCP ==========
  generateDhcp(cfg: DhcpConfig): string[] {
    if (!cfg.enabled) return []
    const cmds: string[] = []
    cmds.push(this.sysView())

    switch (this.vendor) {
      case 'huawei':
        if (cfg.enableServer) cmds.push('dhcp enable')
        cfg.pools.forEach(pool => {
          cmds.push(`ip pool ${pool.name}`, ` network ${pool.network} mask ${pool.mask}`,
            ` gateway-list ${pool.gateway}`)
          if (pool.dns1) cmds.push(` dns-list ${pool.dns1}${pool.dns2 ? ' ' + pool.dns2 : ''}`)
          if (pool.leaseTime) cmds.push(` lease day ${pool.leaseTime.replace(/[^0-9]/g, '')} hour 0 minute 0`)
          if (pool.excludedIps) {
            pool.excludedIps.split(',').map(s => s.trim()).filter(Boolean).forEach(ip => {
              cmds.push(` excluded-ip-address ${ip}`)
            })
          }
          cmds.push('')
        })
        cfg.relayInterfaces.forEach(r => {
          cmds.push(`${this.intfPrefix(r.interface)}`, ` dhcp select relay`,
            ` dhcp server ip ${r.serverIp}`)
          cmds.push('')
        })
        break

      case 'ruijie':
        if (cfg.enableServer) cmds.push('service dhcp')
        cfg.pools.forEach(pool => {
          cmds.push(`ip dhcp pool ${pool.name}`, ` network ${pool.network} ${pool.mask}`,
            ` default-router ${pool.gateway}`)
          if (pool.dns1) cmds.push(` dns-server ${pool.dns1}${pool.dns2 ? ' ' + pool.dns2 : ''}`)
          if (pool.excludedIps) {
            pool.excludedIps.split(',').map(s => s.trim()).filter(Boolean).forEach(ip => {
              cmds.push(` ip dhcp excluded-address ${ip}`)
            })
          }
          cmds.push('')
        })
        cfg.relayInterfaces.forEach(r => {
          cmds.push(`${this.intfPrefix(r.interface)} ip helper-address ${r.serverIp}`)
          cmds.push('')
        })
        break

      case 'h3c':
        if (cfg.enableServer) cmds.push('dhcp enable')
        cfg.pools.forEach(pool => {
          cmds.push(`dhcp server ip-pool ${pool.name}`, ` network ${pool.network} mask ${pool.mask}`,
            ` gateway-list ${pool.gateway}`)
          if (pool.dns1) cmds.push(` dns-list ${pool.dns1}${pool.dns2 ? ' ' + pool.dns2 : ''}`)
          if (pool.excludedIps) {
            pool.excludedIps.split(',').map(s => s.trim()).filter(Boolean).forEach(ip => {
              cmds.push(` forbidden-ip ${ip}`)
            })
          }
          cmds.push('')
        })
        cfg.relayInterfaces.forEach(r => {
          cmds.push(`${this.intfPrefix(r.interface)}`, ` dhcp select relay`,
            ` dhcp relay server-ip ${r.serverIp}`)
          cmds.push('')
        })
        break
    }
    return cmds
  }

  // ========== 路由 ==========
  generateRoute(cfg: RouteConfig): string[] {
    if (!cfg.enabled) return []
    const cmds: string[] = []
    cmds.push(this.sysView())

    // 静态路由
    cfg.staticRoutes.forEach(route => {
      switch (this.vendor) {
        case 'huawei':
          cmds.push(`ip route-static ${route.dest} ${route.mask} ${route.nextHop}${route.preference ? ' preference ' + route.preference : ''}`)
          break
        case 'ruijie':
          cmds.push(`ip route ${route.dest} ${route.mask} ${route.nextHop}${route.preference ? ' ' + route.preference : ''}`)
          break
        case 'h3c':
          cmds.push(`ip route-static ${route.dest} ${route.mask} ${route.nextHop}${route.preference ? ' preference ' + route.preference : ''}`)
          break
      }
    })

    // OSPF
    if (cfg.ospf.enabled) {
      switch (this.vendor) {
        case 'huawei':
          cmds.push(`ospf ${cfg.ospf.processId} router-id ${cfg.ospf.routerId}`)
          cfg.ospf.areas.areas.forEach(area => {
            area.networks.forEach(net => {
              cmds.push(` area ${area.areaId}`, `  network ${net.network} ${net.wildcard}`)
            })
          })
          break
        case 'ruijie':
          cmds.push(`router ospf ${cfg.ospf.processId}`, ` router-id ${cfg.ospf.routerId}`)
          cfg.ospf.areas.areas.forEach(area => {
            area.networks.forEach(net => {
              cmds.push(` network ${net.network} area ${area.areaId} wildcard ${net.wildcard}`)
            })
          })
          break
        case 'h3c':
          cmds.push(`ospf ${cfg.ospf.processId} router-id ${cfg.ospf.routerId}`)
          cfg.ospf.areas.areas.forEach(area => {
            area.networks.forEach(net => {
              cmds.push(` area ${area.areaId}`, `  network ${net.network} ${net.wildcard}`)
            })
          })
          break
      }
    }

    // RIP
    if (cfg.rip.enabled) {
      switch (this.vendor) {
        case 'huawei':
          cmds.push('rip 1', ` version ${cfg.rip.version}`)
          cfg.rip.networkIds.forEach(nid => cmds.push(`  network ${nid}`))
          break
        case 'ruijie':
          cmds.push('router rip', ` version ${cfg.rip.version}`)
          cfg.rip.networkIds.forEach(nid => cmds.push(`  network ${nid}`))
          break
        case 'h3c':
          cmds.push('rip 1', ` version ${cfg.rip.version}`)
          cfg.rip.networkIds.forEach(nid => cmds.push(`  network ${nid}`))
          break
      }
    }

    return cmds
  }

  // ========== 接口与聚合 ==========
  generateInterface(cfg: InterfaceConfType): string[] {
    if (!cfg.enabled) return []
    const cmds: string[] = []
    cmds.push(this.sysView())

    // 接口配置
    cfg.interfaces.forEach(intf => {
      if (!intf.name) return
      cmds.push(this.intfPrefix(intf.name))
      if (intf.description) cmds.push(` description ${intf.description}`)
      if (intf.status === 'down') cmds.push(' shutdown')

      // VLAN模式
      switch (this.vendor) {
        case 'huawei':
          switch (intf.mode) {
            case 'access':
              if (intf.accessVlan) cmds.push(` port link-type access`, ` port default vlan ${intf.accessVlan}`)
              break
            case 'trunk':
              cmds.push(` port link-type trunk`)
              if (intf.trunkVlans) cmds.push(` port trunk allow-pass vlan ${intf.trunkVlans}`)
              break
            case 'hybrid':
              cmds.push(` port link-type hybrid`)
              if (intf.trunkVlans) cmds.push(` port hybrid untagged vlan ${intf.trunkVlans}`)
              break
          }
          if (intf.speed && intf.speed !== 'auto') cmds.push(` speed ${intf.speed}`)
          if (intf.duplex && intf.duplex !== 'auto') cmds.push(` duplex ${intf.duplex}`)
          if (intf.ipAddr) cmds.push(` ip address ${intf.ipAddr} ${intf.mask}`)
          break

        case 'ruijie':
          switch (intf.mode) {
            case 'access':
              if (intf.accessVlan) cmds.push(` switchport mode access`, ` switchport access vlan ${intf.accessVlan}`)
              break
            case 'trunk':
              cmds.push(` switchport mode trunk`)
              if (intf.trunkVlans) cmds.push(` switchport trunk allowed vlan ${intf.trunkVlans}`)
              break
            case 'hybrid':
              cmds.push(` switchport mode hybrid`)
              if (intf.trunkVlans) cmds.push(` switchport hybrid allowed vlan ${intf.trunkVlans}`)
              break
          }
          if (intf.speed && intf.speed !== 'auto') cmds.push(` speed ${intf.speed}`)
          if (intf.duplex && intf.duplex !== 'auto') cmds.push(` duplex ${intf.duplex}`)
          if (intf.ipAddr) cmds.push(` ip address ${intf.ipAddr} ${intf.mask}`)
          break

        case 'h3c':
          switch (intf.mode) {
            case 'access':
              if (intf.accessVlan) cmds.push(` port link-type access`, ` port default vlan ${intf.accessVlan}`)
              break
            case 'trunk':
              cmds.push(` port link-type trunk`)
              if (intf.trunkVlans) cmds.push(` port trunk permit vlan ${intf.trunkVlans}`)
              break
            case 'hybrid':
              cmds.push(` port link-type hybrid`)
              if (intf.trunkVlans) cmds.push(` port hybrid vlan ${intf.trunkVlans} untagged`)
              break
          }
          if (intf.speed && intf.speed !== 'auto') cmds.push(` speed ${intf.speed}`)
          if (intf.duplex && intf.duplex !== 'auto') cmds.push(` duplex ${intf.duplex}`)
          if (intf.ipAddr) cmds.push(` ip address ${intf.ipAddr} ${intf.mask}`)
          break
      }
      cmds.push('')
    })

    // Eth-Trunk / 聚合口
    cfg.trunks.forEach(trunk => {
      if (!trunk.id) return
      const trunkName = this.vendor === 'ruijie'
        ? `Port-channel ${trunk.id}`
        : (this.vendor === 'h3c' ? `Bridge-Aggregation ${trunk.id}` : `Eth-Trunk ${trunk.id}`)

      cmds.push(this.intfPrefix(trunkName))
      if (trunk.description) cmds.push(` description ${trunk.description}`)

      // 聚合模式（华为/华三在聚合口上配置，锐捷在成员口上）
      switch (this.vendor) {
        case 'huawei':
          switch (trunk.mode) {
            case 'manual': cmds.push(' mode manual load-balance'); break
            case 'lacp-static': cmds.push(' mode lacp-static'); break
            case 'lacp-dynamic': cmds.push(' mode lacp-dynamic'); break
          }
          break
        case 'h3c':
          switch (trunk.mode) {
            case 'manual': cmds.push(' link-aggregation mode manual'); break
            case 'lacp-static': cmds.push(' link-aggregation mode static'); break
            case 'lacp-dynamic': cmds.push(' link-aggregation mode dynamic'); break
          }
          break
        // ruijie: 模式在成员接口上通过 channel-group mode 配置
      }
      cmds.push('')

      // 成员接口
      trunk.members.forEach(member => {
        if (!member) return
        cmds.push(this.intfPrefix(member))
        switch (this.vendor) {
          case 'huawei':
            cmds.push(` eth-trunk ${trunk.id}`)
            break
          case 'ruijie':
            switch (trunk.mode) {
              case 'manual': cmds.push(` channel-group ${trunk.id} mode on`); break
              case 'lacp-static': cmds.push(` channel-group ${trunk.id} mode active`); break
              case 'lacp-dynamic': cmds.push(` channel-group ${trunk.id} mode desirable`); break
            }
            break
          case 'h3c':
            cmds.push(` port link-aggregation group ${trunk.id}`)
            break
        }
        cmds.push('')
      })
    })

    return cmds
  }

  // ========== SSH/Telnet ==========
  generateRemote(cfg: RemoteConfig): string[] {
    if (!cfg.enabled) return []
    const cmds: string[] = []
    cmds.push(this.sysView())

    switch (this.vendor) {
      case 'huawei':
        if (cfg.sshEnabled) {
          cmds.push('stelnet server enable', 'rsa local-key-pair create',
            'user-interface vty 0 4',
            ' authentication-mode aaa',
            ' protocol inbound ssh')
          // 端口修改
          if (cfg.sshPort && cfg.sshPort !== 22) {
            cmds.push(`ssh server port ${cfg.sshPort}`)
          }
          cmds.push(' aaa')
          if (cfg.authUsers.length > 0) {
            cfg.authUsers.forEach(user => {
              cmds.push(`  local-user ${user.username} password cipher ${user.password}`,
                `  local-user ${user.username} service-type ssh`,
                `  local-user ${user.username} privilege level ${user.privilege}`)
            })
          }
        } else if (cfg.telnetEnabled) {
          cmds.push('user-interface vty 0 4', ' authentication-mode password',
            ' protocol inbound telnet')
          if (cfg.telnetPort && cfg.telnetPort !== 23) {
            cmds.push(`telnet server port ${cfg.telnetPort}`)
          }
          cmds.push(
            ` set authentication password cipher ${cfg.authUsers[0]?.password || 'admin@123'}`)
        }
        break

      case 'ruijie':
        if (cfg.sshEnabled) {
          cmds.push('ip ssh version 2', 'crypto key generate rsa',
            'line vty 0 4', ' transport input ssh',
            ' login local')
          if (cfg.sshPort && cfg.sshPort !== 22) {
            cmds.push(`ip ssh port ${cfg.sshPort}`)
          }
          cfg.authUsers.forEach(user => {
            cmds.push(`username ${user.username} privilege ${user.privilege} password ${user.password}`)
          })
        } else if (cfg.telnetEnabled) {
          cmds.push('line vty 0 4', ' transport input telnet', ' login')
        }
        break

      case 'h3c':
        if (cfg.sshEnabled) {
          cmds.push('ssh server enable', 'rsa local-key-pair create',
            'user-interface vty 0 4',
            ' authentication-mode scheme',
            ' protocol inbound ssh')
          if (cfg.sshPort && cfg.sshPort !== 22) {
            cmds.push(`ssh server port ${cfg.sshPort}`)
          }
          if (cfg.authUsers.length > 0) {
            cfg.authUsers.forEach(user => {
              cmds.push(` local-user ${user.username}`, `  password simple ${user.password}`,
                `  service-type ssh`, `  authorization-attribute level ${user.privilege}`)
            })
          }
        } else if (cfg.telnetEnabled) {
          cmds.push('user-interface vty 0 4', ' authentication-mode password',
            ' protocol inbound telnet')
          if (cfg.telnetPort && cfg.telnetPort !== 23) {
            cmds.push(`telnet server port ${cfg.telnetPort}`)
          }
          cmds.push(
            ` set authentication password simple ${cfg.authUsers[0]?.password || 'admin'}`)
        }
        break
    }
    return cmds
  }

  // ========== SNMP ==========
  generateSnmp(cfg: SnmpConfig): string[] {
    if (!cfg.enabled) return []
    const cmds: string[] = []
    cmds.push(this.sysView())

    switch (this.vendor) {
      case 'huawei':
        cmds.push('snmp-agent')
        if (cfg.version === 'v3') {
          cmds.push(' snmp-agent usm-user v3')
        } else {
          cfg.communities.forEach(c => {
            const rw = c.permission === 'rw' ? 'write' : 'read'
            cmds.push(` snmp-agent community ${rw} ${c.name}${c.acl ? ` acl ${c.acl}` : ''}`)
          })
        }
        if (cfg.sysContact) cmds.push(` snmp-agent sys-info contact "${cfg.sysContact}"`)
        if (cfg.sysLocation) cmds.push(` snmp-agent sys-info location "${cfg.sysLocation}"`)
        if (cfg.trapEnable) {
          cmds.push(' snmp-agent trap enable')
          cfg.trapServers.forEach(t => {
            const port = t.port && t.port !== 162 ? ` udp-port ${t.port}` : ''
            cmds.push(` snmp-agent target-host trap address udp-domain ${t.host} params securityname public v2c${port}`)
          })
        } else {
          cmds.push(' undo snmp-agent trap enable')
        }
        break

      case 'ruijie':
        if (cfg.version === 'v3') {
          cmds.push('snmp-server group v3group v3 auth')
        } else {
          cfg.communities.forEach(c => {
            cmds.push(`snmp-server community ${c.permission === 'ro' ? 'RO' : 'RW'} ${c.name}`)
          })
        }
        if (cfg.sysContact) cmds.push(`snmp-server contact "${cfg.sysContact}"`)
        if (cfg.sysLocation) cmds.push(`snmp-server location "${cfg.sysLocation}"`)
        if (cfg.trapEnable) cmds.push('snmp-server enable traps')
        break

      case 'h3c':
        cmds.push('snmp-agent')
        cfg.communities.forEach(c => {
          cmds.push(` snmp-agent community ${c.permission === 'rw' ? 'write' : 'read'} ${c.name}`)
        })
        if (cfg.sysContact) cmds.push(` snmp-agent sys-info contact ${cfg.sysContact}`)
        if (cfg.sysLocation) cmds.push(` snmp-agent sys-info location ${cfg.sysLocation}`)
        if (cfg.trapEnable) {
          cmds.push(' snmp-agent trap enable')
          cfg.trapServers.forEach(t => {
            cmds.push(` snmp-agent target-host trap address udp-domain ${t.host}`)
          })
        }
        break
    }
    return cmds
  }

  // ========== ACL/QoS ==========
  generateAcl(cfg: AclConfig): string[] {
    if (!cfg.enabled) return []
    const cmds: string[] = []
    cmds.push(this.sysView())

    let aclCounter = 3000
    cfg.rules.forEach(rule => {
      switch (this.vendor) {
        case 'huawei':
          cmds.push(`acl number ${aclCounter++}`,
            ` rule ${rule.action} ${rule.protocol} source ${rule.sourceIp} ${rule.sourceMask || '0'} destination ${rule.destIp} ${rule.destMask || '0'}`)
          break
        case 'ruijie':
          cmds.push(`ip access-list extended ${aclCounter++}`,
            `${rule.action} ${rule.protocol} ${rule.sourceIp} ${rule.sourceMask || '0.0.0.0'} ${rule.destIp} ${rule.destMask || '0.0.0.0'}`)
          break
        case 'h3c':
          cmds.push(`acl number ${aclCounter++}`,
            ` rule ${rule.action} ${rule.protocol} source ${rule.sourceIp} ${rule.sourceMask || '0'} destination ${rule.destIp} ${rule.destMask || '0'}`)
          break
      }
    })

    // 应用到接口
    cfg.applyToInterfaces.forEach(app => {
      cmds.push(this.intfPrefix(app.interface))
      switch (this.vendor) {
        case 'huawei': cmds.push(` traffic-filter ${app.direction} acl ${app.aclId}`); break
        case 'ruijie': cmds.push(` ip access-group ${app.aclId} ${app.direction}`); break
        case 'h3c': cmds.push(` packet-filter ${app.direction} acl ${app.aclId}`); break
      }
      cmds.push('')
    })

    // QoS 限速
    if (cfg.rateLimitKbps > 0) {
      switch (this.vendor) {
        case 'huawei':
          cmds.push(`traffic classifier c1`, ` traffic behavior b1`,
            `  car cir ${cfg.rateLimitKbps} kbps cbs ${Math.round(cfg.rateLimitKbps * 10)} kbytes green pass red discard`,
            ` traffic policy p1`, `  classifier c1 behavior b1`)
          break
        case 'ruijie':
          cmds.push(`mls qos`, ` policy-map ${cfg.qosPolicyName || 'LIMIT'}`,
            `  class class-default`, `   police ${cfg.rateLimitKbps} conform-action transmit exceed-action drop`)
          break
        case 'h3c':
          cmds.push(`qos car acl any car cir ${cfg.rateLimitKbps} kbps green pass red discard`)
          break
      }
    }

    return cmds
  }

  // ========== NTP ==========
  generateNtp(cfg: NtpConfig): string[] {
    if (!cfg.enabled) return []
    const cmds: string[] = []
    cmds.push(this.sysView())

    switch (this.vendor) {
      case 'huawei':
        if (cfg.timezone) cmds.push(`clock timezone ${cfg.timezone} add 08:00:00`)
        if (cfg.mode === 'client') {
          cfg.servers.split(',').map(s => s.trim()).filter(Boolean).forEach(server => {
            cmds.push(`ntp unicast-server ${server}`)
          })
        } else {
          cmds.push('ntp server refclock-master 2')
        }
        if (cfg.authentication) cmds.push('ntp authentication-enable')
        break

      case 'ruijie':
        if (cfg.timezone) cmds.push(`clock timezone ${cfg.timezone} 8 0`)
        if (cfg.mode === 'client') {
          cfg.servers.split(',').map(s => s.trim()).filter(Boolean).forEach(server => {
            cmds.push(`ntp server ${server}`)
          })
        } else {
          cmds.push('ntp master')
        }
        break

      case 'h3c':
        if (cfg.timezone) cmds.push(`clock timezone ${cfg.timezone} add 08:00:00`)
        if (cfg.mode === 'client') {
          cfg.servers.split(',').map(s => s.trim()).filter(Boolean).forEach(server => {
            cmds.push(`ntp-service unicast-server ${server}`)
          })
        } else {
          cmds.push('ntp-service refclock-master 2')
        }
        break
    }
    return cmds
  }

  // ========== 自定义命令 ==========
  generateCustom(commands: CustomCommand[]): string[] {
    if (!commands.length) return []
    const result: string[] = []
    commands.forEach(cmd => {
      if (cmd.commands?.trim()) {
        result.push(`! ===== ${cmd.title || '自定义'} =====`)
        result.push(...cmd.commands.trim().split('\n'))
        result.push('')
      }
    })
    return result
  }

  // ========== 生成全部命令 ==========
  generateAll(
    basic: BasicConfig,
    vlan: VlanConfig,
    stp: StpConfig,
    dhcp: DhcpConfig,
    route: RouteConfig,
    interfaceConf: InterfaceConfType,
    remote: RemoteConfig,
    snmp: SnmpConfig,
    acl: AclConfig,
    ntp: NtpConfig,
    customCommands: CustomCommand[]
  ): string {
    const sections: string[][] = [
      this.generateBasic(basic),
      this.generateVlan(vlan),
      this.generateStp(stp),
      this.generateDhcp(dhcp),
      this.generateRoute(route),
      this.generateInterface(interfaceConf),
      this.generateRemote(remote),
      this.generateSnmp(snmp),
      this.generateAcl(acl),
      this.generateNtp(ntp),
      this.generateCustom(customCommands)
    ]

    const allCommands: string[] = []
    let firstSection = true
    const endCmd = this.vendor === 'ruijie' ? 'end' : 'return'

    for (const section of sections) {
      if (!section.length) continue
      if (!firstSection) {
        allCommands.push(endCmd, '')
      }
      allCommands.push(...section)
      firstSection = false
    }

    if (allCommands.length && allCommands[allCommands.length - 1] !== endCmd) {
      allCommands.push(endCmd)
    }

    return allCommands.join('\n')
  }
}
