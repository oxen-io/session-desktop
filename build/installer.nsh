!include "LogicLib.nsh"
!include "WinVer.nsh"

!macro preInit
    ; Check the Windows major and minor version numbers
    ${GetWindowsVersion} $0 $1 $2 $3

    ; $0 contains the major version, and $1 contains the minor version.
    ; Windows 10 corresponds to version 10.0.
    ; If the system's version is less than 10.0, abort the installation.
    ${If} $0 < 10
        MessageBox MB_OK|MB_ICONSTOP "This application requires Windows 10 or newer. Installation will now exit."
        Abort
    ${EndIf}
!macroend