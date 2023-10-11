!macro preInit
    ; Load the Windows version
    System::Call 'kernel32::GetVersionExA(i r0) i .r1'
    Pop $0 ; Major version will be popped into $0

    ; Check if the version is less than 10
    ${If} $0 < 10
        MessageBox MB_OK|MB_ICONSTOP "This application requires Windows 10 or newer. Installation will now exit."
        Abort
    ${EndIf}
!macroend