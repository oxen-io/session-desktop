!define checkInstOldGUIDFormat "!insertmacro checkInstOldGUIDFormat"
!macro checkInstOldGUIDFormat
	ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "QuietUninstallString"
    StrCmp $0 "" 0 deleteHKCU
    ; check whether there is an admin installation with the old GUID format in registry, delete if exists
    ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "QuietUninstallString"
    StrCmp $0 "" proceed deleteHKLM
    deleteHKCU:
        ; delete HCKU +keys if exists
        DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
    deleteHKLM:
        ; delete HKLM Keys
        DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
    proceed:
!macroend

!macro customInit
	; check whether there is an existing installation with the old GUID in registry
	${checkInstOldGUIDFormat}
!macroend