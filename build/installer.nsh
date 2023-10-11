!include "WinVer.nsh"

!macro preInit

    ; Print to console
    DetailPrint "Running preInit macro..."

    ; Check if the GetWindowsVersion macro from WinVer.nsh is available and working
    ${If} ${AtMostWin10}
        DetailPrint "Windows version is at most Windows 10"
    ${Else}
        DetailPrint "Windows version is newer than Windows 10"
    ${EndIf}

!macroend
